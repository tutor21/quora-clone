export default {
    routes: [
        {
            method: 'GET',
            path: '/questions/count',
            handler: 'augment.count',
        },
        {
            method: 'GET',
            path: '/questions/home',
            handler: 'augment.homeQuestions',
        },
        {
            method: 'GET',
            path: '/questions/:id/comments',
            handler: 'augment.comments',
        },
        {
            method: 'GET',
            path: '/questions/:id/answers',
            handler: 'augment.answers',
        },
        {
            method: 'GET',
            path: '/questions/:id/comments/count',
            handler: 'augment.commentCount',
        },
        {
            method: 'GET',
            path: '/questions/:id/bot-answers',
            handler: 'augment.botAnswers',
        },
    ]
}