// src/services/rag.js
import { fetchTranscript, chunkTranscript } from './transcript';
import { buildIndex, loadIndex, topK } from './embeddings';

class RAGManager {
  constructor(){
    this.videoId = null;
    this.index = null;
  }

  async loadForVideo(videoId){
    if (!videoId) return;
    if (this.videoId === videoId && this.index) return; // already loaded
    this.videoId = videoId;
    // try cache
    this.index = loadIndex(videoId);
    if (this.index) return;
    const segments = await fetchTranscript(videoId);
    const chunks = chunkTranscript(segments);
    this.index = buildIndex(videoId, chunks);
  }

  getContext(query, k = 5){
    if (!this.index || !query) return '';
    const hits = topK(this.index, query, k);
    const joined = hits.map(h => `- ${h.text}`).join('\n');
    return `YouTube transcript context (most relevant first):\n${joined}`;
  }
}

export const RAG = new RAGManager();
