import { DynamoDBClient, QueryCommand, UpdateItemCommand, ReturnValue } from "@aws-sdk/client-dynamodb";
const dynamodbClient = new DynamoDBClient();

exports.handler = async (event: any, context: any, callback: any) => {
    const updatedAt = new Date().toISOString();
    const currentTime = Date.now();

    const listVoucherParams = {
        TableName: process.env.LIPAWORLD_VOUCHER_TABLE,
        IndexName: 'partitionType-item-index',
        KeyConditionExpression: '#partitionType = :partitionType AND begins_with(#item, :item)',
        ExpressionAttributeNames: {
            '#partitionType': 'partitionType',
            '#item': 'item',
        },
        ExpressionAttributeValues: {
            ':partitionType': { S: 'voucher' },
            ':item': { S: 'VOU' }
        }
    };

    try {
        const command = new QueryCommand(listVoucherParams);
        const listVouchersResult = await dynamodbClient.send(command);

        if ((listVouchersResult.Items?.length ?? 0) > 0) {
            await Promise.all(listVouchersResult.Items!.map(async (item) => {
                if (currentTime > Number(item.expiryTimestamp.N)) {
                    const updateVoucherParams = {
                        ExpressionAttributeNames: {
                            "#VA": "valid",
                            "#UA": "updatedAt"
                        },
                        ExpressionAttributeValues: {
                            ":va": { BOOL: false },
                            ":ua": { S: updatedAt }
                        },
                        Key: {
                            id: { S: item.id.S! },
                            item: { S: item.id.S! }
                        },
                        ReturnValues: ReturnValue.ALL_NEW,
                        TableName: process.env.LIPAWORLD_VOUCHER_TABLE,
                        UpdateExpression: "SET #VA = :va, #UA = :ua"
                    };

                    const command = new UpdateItemCommand(updateVoucherParams);
                    const updateVoucherResult = await dynamodbClient.send(command);

                    if (updateVoucherResult) {
                        console.log(`voucher ${item.id.S} is expired and now invalid!`);
                    } else {
                        console.log(`error updating voucher ${item.id.S}`);
                    };

                } else {
                    console.log("no expired voucher found");
                };
            }));

        } else {
            console.log("no voucher found");
        };

    } catch (err) {
        console.log(err)
    }
};