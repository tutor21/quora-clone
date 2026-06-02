import { factories } from '@strapi/strapi'

export default factories.createCoreController(
    'api::vote.vote',
    ({ strapi }) => ({
        async create(ctx, _next) {
            const { data: { answer = 0, comment = 0, question = 0, bot_answer = 0, voter } } = (ctx.request as any).body

            const existingVotes = await strapi.documents('api::vote.vote').findMany({
                filters: {
                    voter: voter,
                    ...(answer && { answer: { id: { $eq: answer } } }),
                    ...(bot_answer && { bot_answer: { id: { $eq: bot_answer } } }),
                    ...(comment && { comment: { id: { $eq: comment } } }),
                    ...(question && { question: { id: { $eq: question } } }),
                }
            })

            if (!existingVotes.length) {
                const res = await strapi.documents('api::vote.vote').create({
                    ...(ctx.request as any).body,
                })
                ctx.body = res
            } else {
                const res = await strapi.documents('api::vote.vote').update({
                    documentId: existingVotes[0].documentId,
                    ...(ctx.request as any).body,
                })

                ctx.body = res
            }
        }
    })
)