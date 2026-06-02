export default {
    async count(ctx, _next) {
        ctx.body = {
            count: await strapi.documents('api::question.question').count({
                filters: {
                    $or: [
                        {
                            answers: {
                                $not: null
                            }
                        },
                        {
                            bot_answer: {
                                $not: null
                            }
                        }
                    ]
                }
            })
        }
    },
    async comments(ctx, _next) {
        const knex = strapi.db.connection

        const { page = 1, pageSize = 25 } = ctx.request.query.pagination || {}

        const id = ctx.params?.id || ''

        let comments = await strapi.documents('api::comment.comment').findMany({
            filters: {
                question: {
                    id: { $eq: id }
                }
            },
            populate: ['commenter'],
            start: ((page - 1) * pageSize) || 0,
            limit: pageSize || 25
        })

        const commentIds = comments.map(c => c.id)

        const upvoteCounts = await knex('comments as c')
            .leftJoin('votes_comment_lnk as vcl', 'c.id', 'vcl.comment_id')
            .leftJoin('votes as v', 'vcl.vote_id', 'v.id')
            .whereIn('c.id', commentIds)
            .select(
                'c.id as comment_id',
                'c.document_id as comment_document_id',
                knex.raw('SUM(CASE WHEN v.type = ? THEN 1 ELSE 0 END) as upvote_count', ['upvote'])
            )
            .groupBy('c.id')
            .orderBy('upvote_count', 'desc')

        comments = comments.map(c => {
            const uc = upvoteCounts.find(count => count.comment_id == c.id)
            if (uc) c['upvoteCount'] = uc.upvote_count

            return c
        })

        ctx.body = comments
    },
    async answers(ctx, _next) {
        const knex = strapi.db.connection

        const { page = 1, pageSize = 25 } = ctx.request.query.pagination || {}

        const id = ctx.params?.id || ''

        const question = await strapi.documents('api::question.question').findFirst({
            filters: {
                id: { $eq: id }
            }
        })

        if (question) {
            let answers = await strapi.documents('api::answer.answer').findMany({
                filters: {
                    question: {
                        id: { $eq: id }
                    }
                },
                limit: pageSize,
                start: (page - 1) * pageSize || 0,
                populate: ['answerer']
            })

            const answerIds = answers.map(a => a.id)

            const answersWithVotes = await knex('answers as a')
                .leftJoin('votes_answer_lnk as val', 'a.id', 'val.answer_id')
                .leftJoin('votes as v', 'val.vote_id', 'v.id')
                .whereIn('a.id', answerIds)
                .select(
                    'a.id as answer_id',
                    'a.document_id as answer_document_id',
                    knex.raw('SUM(CASE WHEN v.type = ? THEN 1 ELSE 0 END) as upvote_count', ['upvote'])
                )
                .groupBy('a.id')
                .orderBy('upvote_count', 'desc')

            const commentCounts = await knex('answers as a')
                .whereIn('a.id', answerIds)
                .leftJoin('comments_answer_lnk as cal', 'a.id', 'cal.answer_id')
                .leftJoin('comments as c', 'cal.comment_id', 'c.id')
                .select(
                    'a.id as answer_id',
                    'c.id as comment_id',
                    'a.document_id as answer_document_id',
                    knex.raw('COUNT(c.id) as comment_count')
                )
                .groupBy('a.id')
                .orderBy('comment_count', 'desc')

            answers = answers.map((ans) => {
                const tempAnsw = answersWithVotes.find(a => a.answer_id == ans.id)
                ans['upvoteCount'] = tempAnsw?.upvote_count || 0

                const tempCC = commentCounts.find(cc => cc.answer_id == ans.id)
                ans['commentCount'] = tempCC?.comment_count || 0

                return ans
            })

            const answerCount = await strapi.documents('api::answer.answer').count({
                filters: {
                    question: {
                        id: { $eq: id }
                    }
                }
            })

            const commentCount = await strapi.documents('api::comment.comment').count({
                filters: {
                    question: {
                        id: { $eq: id }
                    }
                }
            })

            question['answers'] = answers
            question['answerCount'] = answerCount
            question['commentCount'] = commentCount
        }

        ctx.body = question
    },
    async commentCount(ctx, _next) {
        const id = ctx.params?.id || ''

        let commentCount = await strapi.documents('api::comment.comment').count({
            filters: {
                question: {
                    id: { $eq: id }
                }
            }
        })

        ctx.body = { count: commentCount }
    },
    async homeQuestions(ctx, _next) {
        const knex = strapi.db.connection

        const { page = 1, pageSize = 25 } = ctx.request.query.pagination || {}

        let questions = await strapi.documents('api::question.question').findMany({
            start: (page - 1) * pageSize || 0,
            limit: pageSize
        })

        const answerCount = await knex('questions as q')
            .whereIn('q.id', questions.map(q => q.id))
            .leftJoin('answers_question_lnk as aql', 'q.id', 'aql.question_id')
            .leftJoin('answers as a', 'aql.answer_id', 'a.id')
            .select(
                'q.id as question_id',
                knex.raw('COUNT(a.id) as answer_count')
            )
            .groupBy('q.id')
            .orderBy('answer_count', 'desc')

        const botAnswerCount = await knex('questions as q')
            .whereIn('q.id', questions.map(q => q.id))
            .leftJoin('questions_bot_answer_lnk as qbal', 'q.id', 'qbal.question_id')
            .leftJoin('bot_answers as ba', 'qbal.bot_answer_id', 'ba.id')
            .select(
                'q.id as question_id',
                knex.raw('COUNT(ba.id) as answer_count')
            )
            .groupBy('q.id')
            .orderBy('answer_count', 'desc')


        questions = questions.map(qst => {
            const ac = answerCount.find(el => el.question_id == qst.id)
            const bac = botAnswerCount.find(el => el.question_id == qst.id)
            qst['answerCount'] = (ac.answer_count || 0) + (bac.answer_count || 0)

            return qst
        })

        ctx.body = questions
    },
    async botAnswers(ctx, _next) {
        const id = ctx.params?.id || ''

        const botAnswer = await strapi.documents('api::bot-answer.bot-answer').findFirst({
            filters: {
                question: {
                    id: {
                        $eq: id
                    }
                }
            }
        })

        if (botAnswer) {
            const commentCount = await strapi.documents('api::comment.comment').count({
                filters: {
                    bot_answers: {
                        id: {
                            $eq: botAnswer.id
                        }
                    }
                }
            })

            const upvoteCount = await strapi.documents('api::vote.vote').count({
                filters: {
                    bot_answer: {
                        id: {
                            $eq: botAnswer.id
                        }
                    },
                    type: {
                        $eq: 'upvote'
                    }
                }
            })

            botAnswer["commentCount"] = commentCount
            botAnswer["upvoteCount"] = upvoteCount

            ctx.body = [botAnswer]
            return
        }

        ctx.body = []
    }
}