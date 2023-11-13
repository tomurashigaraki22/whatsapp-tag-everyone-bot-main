const { Configuration, OpenAIApi } = require('openai')

const configuration = new Configuration({
    apiKey: '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',
})

const openai = new OpenAIApi(configuration)

async function question(ask) {
    try {
        const response = await openai.createCompletion({
            model: 'text-davinci-003',
            prompt: ask
        })
        return response.data.choices[0].text.trim();
    } catch (error) {
        console.error(error);
        return null;
    }
}

module.exports = question;
