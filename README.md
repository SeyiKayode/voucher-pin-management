# Voucher Pin Management with Node.js (Typescript) and AWS

Develop a secure Node.js API with Typescript using AWS Lambda to manage voucher codes for my African fintech business.

The assessment entails generating a secured 16 character codes which are not predictable or easily guessed and does not contain offensive words. After this code have been generated, it should be stored securely in DynamoDB. There should be a retrieval of the voucher information from DynamoDB after it has been stored.
A lambda function would be scheduled using AWS to scan the DynamoDB for expired voucher codes once a day (at 00:30am SAST) and mark them as invalid. The operations should also be logged for audit reasons.

I analyzed and commenced the task following the procedures below:


## - Creating the backend environemt
* I made use of aws cdk typescript to create a backend environment. It allows me to efficiently create and manage resources needed such as the Lambda, IAM role, AppSync (GRAPHQL API) or API Gateway (REST API), DynamoDB and Eventbridge. It also enable to create CI/CD pipeline for the backend deployment.


## - Generating the secure voucher codes
* To generate a secured 16 character codes using node.js, i created a function named generateVoucherCode for an API endpoint where i used the built in `crypto` package. It has the ability to generate a unique, non guessable and hardly predictable code for each user using `randomBytes` which can generate characters of specified length. I specified 16 as the length, converted the generated characters to string in a base64 format, i validated the characters with regex to check if it contains only alpha-numeric characters and also checked the length again to be sure the characters are 16 after the conversion and validation.
* After the code has been generated, i checked for offensive words and made use of the npm `bad-words` package. It is a package that checks for foul or offensive words in characters. It also allows the flexibility of adding custom foul words to check against. When the 16 character code is generated, i checked against offensive words using this package. If it contains an offensive word, the 16 character code is regenerated and rechecked until it does not contain any offensive word.


## - Storing the voucher codes in DynamoDB
* We are now able to generate our unique 16 character codes containing no offensive words and only consists of alpha-numeric characters but we need to store it securely in DynamoDB. To store the code securely, we need to encrypt it. I made use of encryption at rest in DynamoDB and AWS Encryption SDK for javascript.
* While creating the DynamoDB table, i enabled encryption using AWS owned key (due to no additional charge). We can also use an AWS managed key or a customer managed key but at an additional charge. By doing this, DynamoDB encrypts our data for us by providing enhanced security.
* For the encryption using AWS Encryption SDK for javascript, i installed the npm `@aws-crypto/client-node` package for node.js. It allows encryption at rest and in transit. We can use it to encrypt sensitive data before storing them into the DB or while sharing them over HTTP, WebSocket connections, between client-side apps and backend services.
* The `@aws-crypto/client-node` package requires a generator key id to encrypt and decrypt data so i created one using AWS KMS (Key Management Service) and restricted permissions for security purpose. The created AWS KMS key is then used as the generator key id to encrypt the generated voucher code before storing it in DynamoDB. This way, the voucher code is stored securely in DynamoDB.


## - Retrieving voucher information
* While creating the voucher, i included some fields such as createdAt, updatedAt, expiryDate and expiryTimestamp (i used 24 hours as expiry time), valid, name, sex etc alongside the voucher code. To retrieve this information using a separate API endpoint, i created another function named getVoucherCode which calls the DynamoDB table to get the voucher information.
* After calling the DynamoDB Get Operation to retrieve the voucher information, it returned our saved data but the voucher code is encrypted and i had to decrypt it using same `@aws-crypto/client-node` package and the created AWS KMS key to decrypt the data and make it return a readable response.


## - Scheduled Daily Task
* To create the scheduled daily task, i made use of the AWS Eventbridge resource created earlier with cdk to create a rule and a cron job that triggers a Lambda function at 00:30 am SAST once a day.
* When the Lambda function is triggered once a day during 00:30 am SAST, it makes a query operation for all voucher codes. I used a DynamoDB GSI (Global Secondary Index) to make this query as it is cheaper, efficient and faster. It makes use of the specified partitionKey and sortKey to get all voucher codes in the DynamoDB Table rather than a scan operation that checks for all items in the table either the item is a voucher or not which leads to a more expensive and slower operation.
* After the query operation is made, i mapped the response checking for the current timestamp against the expiryTimestamp that was included while creating the voucher code. If the condition returns that the expiryTimestamp is passed or expired, the expired voucher codes `valid (boolean field)` is made false and updated in DyanmoDB.


## - Security Considerations, Logging and Development
* While creating the AWS resources needed for the task, i made sure to only grant access for each resource that needs each other like the DynamoDB granting access to the lambda functions, the lambda function IAM role and policy, the AWS KMS key permission and the Eeventbridge rule permission for lambda.
* I made use of the lambda envs for environment variables that are needed in the lambda functions.
* I encrypted the DyanmoDB while creating it and also made use of an AWS KMS key with restricted permissions for the AWS Encryption sdk library.
* The generated 16 character codes are made up of unique characters which are hard to predict and also non guessable.
* I logged the response from each functions and operations to AWS Cloudwatch, same as for the scheduler task.
