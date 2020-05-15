const { hostname } = require('os');
const { isFunction } = require('util');
const { Transport } = require('winston');
const { QueueServiceClient, StorageSharedKeyCredential } = require("@azure/storage-queue")

class AzureQueueTransport extends Transport {

    constructor(options) {
        options = options || {};

        super(options);

        this._queueService = null;
        this.name = 'azureQueueTransport';
        this.silent = options.silent;
        this.level = options.level || 'info';
        this.queueName = options.queueName || 'logs';
        this.pid = options.pid || process.pid;
        this.maxTries = options.maxTries || 6;
        this.maxRetryDelayInMs = options.maxRetryDelayInMs || 5000;
        this.retryDelayInMs = options.retryDelayInMs || 2500;
        this.env = options.env || process.env.NODE_ENV;
        this.encodedBase64 = options.encodedBase64;

        options.storageAccount = options.storageAccount || process.env.AZURE_STORAGE_ACCOUNT;
        options.storageAccessKey = options.storageAccessKey || process.env.AZURE_STORAGE_ACCESS_KEY;

        if (!options.serviceClient) {
            if (!options.storageAccount) throw new Error('invalid azure storage account!');
            if (!options.storageAccessKey) throw new Error('invalid azure storage access key!');

            options.serviceClient = new QueueServiceClient(`https://${options.storageAccount}.queue.core.windows.net`,
                new StorageSharedKeyCredential(options.storageAccount, options.storageAccessKey), {
                    retryOptions: { maxTries: this.maxTries, maxRetryDelayInMs: this.maxRetryDelayInMs, retryDelayInMs: this.maxRetryDelayInMs }
                });
        }

        options.serviceClient.createQueue(this.queueName)
            .catch(error => {
                this.emit('error', error)
            })

        this._queueService = options.serviceClient.getQueueClient(this.queueName)
    }

    log(level, msg, meta, callback) {
        if (this.silent) return callback(null, true);

        if (isFunction(meta)) {
            callback = meta;
            meta = {};
        }

        const message = {
            ...meta,
            message: msg,
            level: level,
            host: hostname(),
            env: this.env,
            pid: this.pid
        }
     
        this._queueService.sendMessage(this.encodedBase64 ? Buffer.from(JSON.stringify(message)).toString('base64') : JSON.stringify(message))
            .then(() => callback(null, true))
            .catch(callback)
    }
}

module.exports = { AzureQueueTransport };