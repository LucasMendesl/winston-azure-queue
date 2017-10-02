const azure            = require('azure-storage');
const { isFunction }   = require('util');
const { Transport }    = require('winston');
const { hostname }     = require('os');


class AzureQueueTransport extends Transport {

    constructor (options) {         
        options = options || {};

        super(options);
                
        this._queueService = null;
        this.name = 'azureQueueTransport';
        this.silent = options.silent                        || false;
        this.level = options.level                          || 'info';
        this.queueName = options.queueName                  || 'logs';
        this.pid = options.pid                              || process.pid;
        this.env = options.env                              || process.env.NODE_ENV;
        
        options.storageAccount = options.storageAccount     || process.env.AZURE_STORAGE_ACCOUNT;
        options.storageAccessKey = options.storageAccessKey || process.env.AZURE_STORAGE_ACCESS_KEY;
        
        if (options.connectionString) {
            this._queueService = azure.createQueueService(options.connectionString);
        } else {
            if (!options.storageAccount) throw new Error('invalid azure storage account!');
            if (!options.storageAccessKey) throw new Error('invalid azure storage access key!');
            
            this._queueService = azure.createQueueService(options.storageAccount, options.storageAccessKey);
        }
    
        this._queueService.createQueueIfNotExists(this.queueName, (error, result, response) => {
            if (error){
                this.emit('error', error);
            }
        });
    }

    log (level, msg, meta, callback) {
        if (this.silent) return callback(null, true);
        
        if (isFunction(meta)) {
            callback = meta;
            meta = {};
        }

        this._send(Object.assign({
            message: msg,
            level: level,
            host: hostname(),
            env: this.env,
            pid: this.pid
        }, meta), callback);
    }

    _send (data, callback) {

        this._queueService.createMessage(this.queueName, JSON.stringify(data), (error, result, response) => {
            if (!error){
                this.emit('logged', { result: result, response: response });
                return callback(null, true);   
            }

            this.emit('error', error);
            return callback(error);
        })
    }
}

module.exports = { AzureQueueTransport };