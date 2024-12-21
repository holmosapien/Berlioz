import {
    GenerateContentResult,
    GenerativeModel,
    GoogleGenerativeAI,
    ModelParams,
    Part,
    StartChatParams,
} from '@google/generative-ai'

import { ChatHistoryContent } from 'lib/records'

interface RequestMedia {
    data: string,
    mimeType: string,
}

interface GeneratedResponse {
    contentResult: GenerateContentResult
    history: ChatHistoryContent[]
}

class Gemini {
    model: GenerativeModel
    history?: ChatHistoryContent[]

    constructor(history?: ChatHistoryContent[]) {
        const apiKey: string | undefined = process.env.GEMINI_API_KEY

        if (!apiKey) {
            throw new Error("GEMINI_API_KEY must be defined")
        }

        const g = new GoogleGenerativeAI(apiKey)

        const modelParams: ModelParams = {
            model: 'gemini-2.0-flash-exp'
        }

        this.model = g.getGenerativeModel(modelParams)
        this.history = history
    }

    async generateContent(prompt: string, media?: RequestMedia): Promise<GeneratedResponse> {

        /*
         * Generate a new chat session, pre-filled with any history
         * from this thread.
         *
         */

        let chatParams: StartChatParams = {}

        if (this.history) {
            chatParams = {
                history: this.history
            }
        }

        const chat = this.model.startChat(chatParams)

        /*
         * Assemble the request.
         *
         */

        let imagePart: Part | null = null

        if (media) {
            imagePart = {
                inlineData: {
                    data: media.data,
                    mimeType: media.mimeType,
                },
            }
        }

        const contentArgs = (imagePart)
            ? [prompt, imagePart]
            : prompt

        const result = await chat.sendMessage(contentArgs)

        /*
         * Get the history of the chat session so we can update the database.
         *
         */

        const history = await chat.getHistory()

        const response: GeneratedResponse = {
            contentResult: result,
            history,
        }

        return response
    }
}

export default Gemini

export {
    GeneratedResponse,
    RequestMedia,
}