module.exports = {
    afterCreate(event) {
        const { result } = event

        function handleError(err) {
            return Promise.reject(err)
        }

        fetch(
            `${process.env.CLOUDFLARE_API_URL}/${process.env.CLOUDFLARE_ACCOUNT_ID}/${process.env.CLOUDFLARE_AI_MODEL}`,
            {
                method: 'POST',
                headers: {
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
                },
                body: JSON.stringify({
                    prompt: result.title
                }),
            }
        )
            .then(res => {
                if (res.ok) {
                    return res.json()
                } else {
                    handleError(res)
                }
            },
                handleError
            )
            .then(pr => {
                return fetch(
                    `http${process.env.HOST == '0.0.0.0' || process.env.HOST == 'localhost' ? '' : 's'}://${process.env.HOST}:${process.env.PORT}/api/bot-answers`,
                    {
                        method: 'POST',
                        headers: {
                            "Accept": "application/json",
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${process.env.STRAPI_BOT_API_TOKEN}`,
                        },
                        body: JSON.stringify({
                            data: {
                                body: (pr as { result: { response: string } }).result.response,
                                question: result.id
                            }
                        }),
                    })
            },
                handleError
            )
            .then(res => {
                if (res.ok) {
                    return res.json()
                } else {
                    handleError(res)
                }
            },
                handleError
            )
            .then(data => {
                return data
            },
                handleError
            )
    },
};