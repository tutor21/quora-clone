const processRequest = async (ctx, uid, userRole, populate = []) => {
    const { page = 1, pageSize = 25 } = ctx.request.query.pagination || {}

    const id = ctx.params?.id || ''

    const results = await strapi.documents(uid).findMany({
        filters: {
            [userRole]: {
                id: { $eq: id }
            }
        },
        populate,
        start: ((page - 1) * pageSize) || 0,
        limit: pageSize || 25
    })

    ctx.body = results
}

const countEntries = async (ctx, uid, userRole) => {
    const id = ctx.params?.id || ''

    const count = await strapi.documents(uid).count({
        filters: {
            [userRole]: {
                id: { $eq: id }
            }
        }
    })

    ctx.body = { count }
}

async function questions(ctx) {
    await processRequest(
        ctx,
        'api::question.question',
        null
    )
}
async function answers(ctx) {
    await processRequest(
        ctx,
        'api::answer.answer',
        'answerer',
        ['question']
    )
}
async function comments(ctx) {
    await processRequest(
        ctx,
        'api::comment.comment',
        'commenter',
        ['question', 'answer']
    )
}
async function votes(ctx) {
    await processRequest(
        ctx,
        'api::vote.vote',
        'voter',
        ['question', 'answer', 'comment']
    )
}

async function questionCount(ctx) {
    await countEntries(
        ctx,
        'api::question.question',
        'asker'
    )
}
async function answerCount(ctx) {
    await countEntries(
        ctx,
        'api::answer.answer',
        'answerer',
    )
}
async function commentCount(ctx) {
    await countEntries(
        ctx,
        'api::comment.comment',
        'commenter',
    )
}
async function voteCount(ctx) {
    await countEntries(
        ctx,
        'api::vote.vote',
        'voter',
    )
}


module.exports = (plugin) => {
    plugin.controllers.user['answers'] = answers
    plugin.controllers.user['answerCount'] = answerCount
    plugin.controllers.user['comments'] = comments
    plugin.controllers.user['commentCount'] = commentCount
    plugin.controllers.user['questions'] = questions
    plugin.controllers.user['questionCount'] = questionCount
    plugin.controllers.user['votes'] = votes
    plugin.controllers.user['voteCount'] = voteCount

    plugin.routes['content-api'].routes.push(
        {
            method: 'GET',
            path: '/users/:id/answers',
            handler: 'user.answers',
            config: { prefix: '' }
        },
        {
            method: 'GET',
            path: '/users/:id/answers/count',
            handler: 'user.answerCount',
            config: { prefix: '' }
        },
        {
            method: 'GET',
            path: '/users/:id/comments',
            handler: 'user.comments',
            config: { prefix: '' }
        },
        {
            method: 'GET',
            path: '/users/:id/comments/count',
            handler: 'user.commentCount',
            config: { prefix: '' }
        },
        {
            method: 'GET',
            path: '/users/:id/questions',
            handler: 'user.questions',
            config: { prefix: '' }
        },
        {
            method: 'GET',
            path: '/users/:id/questions/count',
            handler: 'user.questionCount',
            config: { prefix: '' }
        },
        {
            method: 'GET',
            path: '/users/:id/votes',
            handler: 'user.votes',
            config: { prefix: '' }
        },

        {
            method: 'GET',
            path: '/users/:id/votes/count',
            handler: 'user.voteCount',
            config: { prefix: '' }
        }
    )

    return plugin;
};