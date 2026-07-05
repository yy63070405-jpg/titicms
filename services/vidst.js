const axios = require('axios');

class VidstService {
  constructor(config) {
    this.apiKey = config.apiKey;
    this.baseURL = config.baseURL;
  }

  async request(action, params = {}) {
    try {
      const url = new URL(this.baseURL);
      url.searchParams.set('key', this.apiKey);
      url.searchParams.set('action', action);
      Object.keys(params).forEach(key => {
        url.searchParams.set(key, params[key]);
      });
      const response = await axios.get(url.toString());
      if (response.data.status !== 200) {
        throw new Error(response.data.msg || 'API request failed');
      }
      return response.data;
    } catch (error) {
      const errorMsg = error.response?.data?.msg || error.message || 'Unknown error';
      throw new Error(errorMsg);
    }
  }

  async getAccountInfo() {
    return await this.request('account/info');
  }

  async getAccountStats() {
    return await this.request('account/stats');
  }

  async getUploadToken() {
    return await this.request('upload/token');
  }

  async getUploadServer() {
    return await this.request('upload/server');
  }

  async uploadFile(filePath) {
    try {
      const tokenResult = await this.getUploadToken();
      const token = tokenResult.result.token;
      const serverResult = await this.getUploadServer();
      const uploadServer = serverResult.result;
      const uploadURL = uploadServer.endpoint;

      const FormData = require('form-data');
      const fs = require('fs');
      const form = new FormData();
      form.append('token', token);
      form.append('file', fs.createReadStream(filePath));

      const response = await axios.post(uploadURL, form, {
        headers: {
          ...form.getHeaders(),
          'Content-Type': `multipart/form-data; boundary=${form.getBoundary()}`
        }
      });

      let uploadResult = response.data;
      if (uploadResult && typeof uploadResult === 'string') {
        try {
          uploadResult = JSON.parse(uploadResult);
        } catch (e) {
          throw new Error('Invalid upload response: ' + uploadResult);
        }
      }

      const completeResult = await this.request('upload/complete', { token });
      
      let fileInfo = null;
      if (completeResult.result) {
        fileInfo = completeResult.result;
      } else if (completeResult.data) {
        fileInfo = completeResult.data;
      }

      let videoUrl = '';
      let fileId = '';
      
      if (fileInfo) {
        if (fileInfo.hls_url) {
          videoUrl = fileInfo.hls_url;
        } else if (fileInfo.url) {
          videoUrl = fileInfo.url;
        } else if (fileInfo.file_path && fileInfo.file_path.startsWith('http')) {
          videoUrl = fileInfo.file_path;
        }
        
        fileId = fileInfo.id || fileInfo.file_id || '';
      }

      return { 
        upload: uploadResult, 
        complete: completeResult,
        fileInfo: fileInfo,
        videoUrl: videoUrl,
        fileId: fileId
      };
    } catch (error) {
      const errorMsg = error.response?.data?.msg || error.response?.data?.error || error.message || 'Upload failed';
      throw new Error(errorMsg);
    }
  }

  async uploadURL(url) {
    return await this.request('upload/url', { url });
  }

  async getFiles() {
    return await this.request('file/list');
  }

  async getFileInfo(fileID) {
    return await this.request('file/info', { file_id: fileID });
  }

  async getFileStats(fileID) {
    return await this.request('file/stats', { file_id: fileID });
  }

  async deleteFile(fileID) {
    return await this.request('file/delete', { file_id: fileID });
  }

  async renameFile(fileID, title) {
    return await this.request('file/rename', { file_id: fileID, title });
  }

  async getFolders() {
    return await this.request('folder/list');
  }

  async createFolder(name) {
    return await this.request('folder/create', { name });
  }

  async deleteFolder(name) {
    return await this.request('folder/delete', { name });
  }

  async setWebhook(url) {
    return await this.request('webhook/set', { url });
  }
}

module.exports = VidstService;