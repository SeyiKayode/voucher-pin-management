import { unmarshall } from "@aws-sdk/util-dynamodb";
import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";
const dynamodbClient = new DynamoDBClient();

const { KmsKeyringNode, buildClient, CommitmentPolicy } = require('@aws-crypto/client-node');
const generatorKeyId = process.env.KMS_KEY_ARN;
const keyring = new KmsKeyringNode({ generatorKeyId });
const { decrypt } = buildClient(CommitmentPolicy.REQUIRE_ENCRYPT_REQUIRE_DECRYPT);

async function getVoucherCode(id: string) {
    const params = {
        TableName: process.env.LIPAWORLD_VOUCHER_TABLE,
        Key: {
            id: { S: id },
            item: { S: id }
        }
    };

    try {
        const command = new GetItemCommand(params);
        const response = await dynamodbClient.send(command);

        if (response) {
            const data = unmarshall(response.Item!);
            const { plaintext } = await decrypt(keyring, Buffer.from(data.voucherCode, 'base64'));
            data.voucherCode = plaintext.toString('utf-8');
            
            return { voucher: data };
        };

    } catch (err) {
        let errorMsg = (err as Error).message
        return { error: errorMsg };
    }
};

export default getVoucherCode;