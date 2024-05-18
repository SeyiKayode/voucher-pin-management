import { AppSyncEvent } from './types';
import generateVoucherCode from './generateVoucherCode';
import getVoucherCode from './getVoucherCode';

exports.handler = async (event: AppSyncEvent) => {
    switch (event.info.fieldName) {
        case 'generateVoucherCode':
            return await generateVoucherCode(event.arguments.generateVoucherPayload);
        case 'getVoucherCode':
            return await getVoucherCode(event.arguments.id)
    }
};