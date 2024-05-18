import { GenerateVoucherPayload } from "../types";
import { v4 as uuidv4 } from "uuid";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { DynamoDBClient, PutItemCommand, ReturnValue } from "@aws-sdk/client-dynamodb";
const dynamodbClient = new DynamoDBClient();

const { KmsKeyringNode, buildClient, CommitmentPolicy } = require('@aws-crypto/client-node');
const generatorKeyId = process.env.KMS_KEY_ARN;
const keyring = new KmsKeyringNode({ generatorKeyId });
const { encrypt } = buildClient(CommitmentPolicy.REQUIRE_ENCRYPT_REQUIRE_DECRYPT);

const crypto = require('crypto');
const Filter = require('bad-words');
const filter = new Filter();
filter.addWords("fool", "bitch") // can also customize the filtered words by adding to it

async function generateVoucherCode(payload: GenerateVoucherPayload) {
    const id = `VOU-${uuidv4()}`;
    const createdAt = new Date().toISOString();
    const expiryDate = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString();

    const convertToTimestamp = new Date(expiryDate)
    const expiryTimestamp = convertToTimestamp.getTime()
    let code: string;

    try {
        do {
            // a random string of 16 characters is generated here
            code = crypto.randomBytes(16)
                         .toString('base64')
                         .replace(/[^a-zA-Z0-9]/g, '') // removal of characters aside letters or numbers
                         .slice(0, 16); // check if character is 16
        } while (filter.isProfane(code)); // repeat the code if it contains offensive words

        const context = {
            stage: 'demo',
            purpose: 'simple voucher code app',
            origin: "eu-west-1"
        };
        const { result } = await encrypt(keyring, code, { encryptionContext: context }); // encrypting the data using AWS Encryption SDK for JavaScript client for Node.js

        // create voucher code object
        const voucherCodeObject = {
            id: { S: id },
            item: { S: id },
            name: { S: payload.name },
            sex: { S: payload.sex },
            voucherCode: { S: result.toString("base64") },
            valid: { BOOL: true },
            partitionType: { S: "voucher" },
            createdAt: { S: createdAt },
            updatedAt: { S: createdAt },
            expiryDate: { S: expiryDate },
            expiryTimestamp: { N: expiryTimestamp.toString() },
        };

        const voucherCodeParams = {
            TableName: process.env.LIPAWORLD_VOUCHER_TABLE,
            Item: voucherCodeObject,
            ReturnValues: ReturnValue.ALL_OLD
        };

        // save voucher code object into db
        const command = new PutItemCommand(voucherCodeParams);
        const response = await dynamodbClient.send(command);

        if (response) {
            const data = unmarshall(voucherCodeObject);
            data.voucherCode = code;
            
            return { voucher: data };
        };

    } catch (err) {
        let errorMsg = (err as Error).message
        return { error: errorMsg };
    }
};

export default generateVoucherCode;