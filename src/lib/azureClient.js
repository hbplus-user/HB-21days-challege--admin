import { BlobServiceClient } from '@azure/storage-blob';

const accountName = "hbplusstorage";
const containerName = "hb-playground";
const sasToken = process.env.NEXT_PUBLIC_AZURE_SAS_TOKEN;
const endpoint = `https://${accountName}.blob.core.windows.net`;

const blobServiceClient = new BlobServiceClient(`${endpoint}?${sasToken}`);
const containerClient = blobServiceClient.getContainerClient(containerName);

export { containerClient };

/**
 * Uploads a file to Azure Blob Storage
 * @param {File} file 
 * @param {string} folder 
 * @returns {Promise<string>} The URL of the uploaded file
 */
export const uploadToAzure = async (file, folder = 'proofs') => {
  const blobName = `${folder}/${Date.now()}-${file.name}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  
  await blockBlobClient.uploadData(file, {
    blobHTTPHeaders: { blobContentType: file.type }
  });
  
  return blockBlobClient.url;
};
