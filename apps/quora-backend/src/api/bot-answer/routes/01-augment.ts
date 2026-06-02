export default {
    routes: [
        {
            method: 'GET',
            path: '/bot-answers/:id/comments',
            handler: 'augment.comments',
        },
        {
            method: 'GET',
            path: '/bot-answers/:id/comments/count',
            handler: 'augment.commentCount',
        },
    ]
}