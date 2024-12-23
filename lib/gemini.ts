import {
    GenerateContentResult,
    GenerativeModel,
    GoogleGenerativeAI,
    FileDataPart,
    ModelParams,
    StartChatParams,
} from '@google/generative-ai'

import {
    FileMetadata,
    GoogleAIFileManager,
} from '@google/generative-ai/server'

import {
    ChatHistoryContent,
    GenerativeRequest,
} from 'lib/records'

interface RequestMedia {
    fileUri: string,
    mimeType: string,
}

interface GeneratedResponse {
    contentResult: GenerateContentResult
    history: ChatHistoryContent[]
}

class Gemini {
    model: GenerativeModel
    fileManager: GoogleAIFileManager
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
        this.fileManager = new GoogleAIFileManager(apiKey)
        this.history = history
    }

    async generateContent(request: GenerativeRequest): Promise<GeneratedResponse> {

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

        let mediaPart: FileDataPart | null = null

        if (request.media) {
            const metadata: FileMetadata = {
                mimeType: request.media.mimeType,
            }

            const uploadResult = await this.fileManager.uploadFile(request.media.filename, metadata)

            mediaPart = {
                fileData: {
                    fileUri: uploadResult.file.uri,
                    mimeType: uploadResult.file.mimeType,
                }
            }

            console.log(`Including media with mimeType=${request.media.mimeType}`)
        }

        const contentArgs = (mediaPart)
            ? [request.prompt, mediaPart]
            : request.prompt

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