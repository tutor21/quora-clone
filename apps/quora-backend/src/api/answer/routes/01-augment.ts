export default {
    routes: [
        {
            method: 'GET',
            path: '/answers/home',
            handler: 'augment.home',
        },
        {
            method: 'GET',
            path: '/answers/home/count',
            handler: 'augment.homeCount',
        },
        {
            method: 'GET',
            path: '/answers/:id/comments',
            handler: 'augment.comments',
        },
        {
            method: 'GET',
            path: '/answers/:id/comments/count',
            handler: 'augment.commentCount',
        },
    ]
}