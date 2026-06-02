export default {
    async comments(ctx, _next) {
        const { page = 1, pageSize = 25 } = ctx.request.query.pagination || {}

        const id = ctx.params?.id || ''

        let comments = await strapi.documents('api::comment.comment').findMany({
            filters: {
                bot_answers: {
                    id: { $eq: id }
                }
            },
            populate: ['commenter'],
            sort: 'createdAt:desc',
            start: ((page - 1) * pageSize) || 0,
            limit: pageSize || 25
        })

        const knex = strapi.db.connection

        const upvoteCounts = await knex('comments as c')
            .leftJoin('votes_comment_lnk as vcl', 'c.id', 'vcl.comment_id')
            .leftJoin('votes as v', 'vcl.vote_id', 'v.id')
            .whereIn('c.id', comments.map(c => c.id))
            .select(
                'c.id as comment_id',
                'c.document_id as comment_document_id',
                knex.raw('SUM(CASE WHEN v.type = ? THEN 1 ELSE 0 END) as upvote_count', ['upvote'])
            )
            .groupBy('c.id')

        comments = comments.map((comment) => {
            const tempUVC = upvoteCounts.find(uvc => uvc.comment_id == comment.id)
            comment['upvoteCount'] = tempUVC?.upvote_count || 0

            return comment
        })

        ctx.body = comments
    },
    async commentCount(ctx, _next) {
        const id = ctx.params?.id || ''

        let commentCount = await strapi.documents('api::comment.comment').count({
            filters: {
                bot_answers: {
                    id: { $eq: id }
                }
            }
        })

        ctx.body = { count: commentCount }
    }
}