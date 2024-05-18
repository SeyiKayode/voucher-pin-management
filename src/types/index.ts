export type GenerateVoucherPayload = {
    name: string
    sex: string
}

export type AppSyncEvent = {
    info: {  
        fieldName: string
    },
    identity:{
        sub: string
    },
    arguments: {
        id: string
        generateVoucherPayload: GenerateVoucherPayload
    }
};