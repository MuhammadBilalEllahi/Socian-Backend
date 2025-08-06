import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

class S3Service {
    constructor() {
        this.s3Client = new S3Client({
            region: process.env.AWS_REGION,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            },
        });
    }

    async getObject(key) {
        const command = new GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
        });
        return await this.s3Client.send(command);
    }

    async putObjectBuffer(key, body, contentType) {
        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: key,
            Body: body,
            ContentType: contentType,
        });
        return await this.s3Client.send(command);
    }

    async putObjectFile(key, body, contentType) {
        const upload = new Upload({
            client: this.s3Client,
            params: {
                Bucket: process.env.AWS_S3_BUCKET,
                Key: key,
                Body: body,
                ContentType: contentType,
            },
        });

        return await upload.done();
    }
}

const s3Service = new S3Service();
export default s3Service;