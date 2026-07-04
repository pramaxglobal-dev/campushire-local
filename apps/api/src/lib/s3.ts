import path from "path";
import slugify from "slugify";
import { nanoid } from "nanoid";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { env } from "../config/env";

const isS3Configured =
  Boolean(env.AWS_ACCESS_KEY_ID) &&
  Boolean(env.AWS_SECRET_ACCESS_KEY) &&
  Boolean(env.AWS_REGION) &&
  Boolean(env.AWS_S3_BUCKET);

const s3Client: S3Client | null = isS3Configured
  ? new S3Client({
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: env.AWS_SECRET_ACCESS_KEY as string
      }
    })
  : null;

const getS3Client = (): S3Client => {
  if (!s3Client || !env.AWS_S3_BUCKET) {
    throw new Error("S3 is not configured.");
  }
  return s3Client;
};

export const uploadFile = async (key: string, buffer: Buffer, mimeType: string): Promise<string> => {
  const client = getS3Client();

  const commandInput: PutObjectCommandInput = {
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: mimeType
  };

  await client.send(new PutObjectCommand(commandInput));

  return `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com/${key}`;
};

export const getPresignedUrl = async (key: string, expiresIn = 900): Promise<string> => {
  const client = getS3Client();
  const command = new GetObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key
  });
  return getSignedUrl(client, command, { expiresIn });
};

export const deleteFile = async (key: string): Promise<void> => {
  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: key
    })
  );
};

export const generateFileKey = (folder: string, filename: string): string => {
  const ext = path.extname(filename) || "";
  const base = path.basename(filename, ext);
  const normalizedName = slugify(base, { lower: true, strict: true }) || "file";
  return `${folder}/${normalizedName}-${nanoid(10)}${ext.toLowerCase()}`;
};
