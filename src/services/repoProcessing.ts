import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { QdrantClient } from "@qdrant/js-client-rest";
import { pipeline } from "@xenova/transformers";

// Initialize Qdrant client
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL,
  apiKey: process.env.QDRANT_API_KEY,
});

// Initialize embedding pipeline (cached globally)
let embeddingPipeline: any = null;

// ULTRA-FAST local embeddings using transformers.js
const generateEmbeddings = async (texts: string[]): Promise<number[][]> => {
  try {
    console.log(`🚀 Generating local embeddings for ${texts.length} texts...`);

    // Initialize pipeline if not already done
    if (!embeddingPipeline) {
      console.log(`📥 Loading embedding model...`);
      embeddingPipeline = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2"
      );
      console.log(`✅ Embedding model loaded`);
    }

    // Generate embeddings for all texts
    const embeddings: number[][] = [];

    for (const text of texts) {
      const result = await embeddingPipeline(text, {
        pooling: "mean",
        normalize: true,
      });
      embeddings.push(Array.from(result.data));
    }

    console.log(`✅ Generated ${embeddings.length} embeddings locally`);
    return embeddings;
  } catch (error: any) {
    console.error(`❌ Local embedding error: ${error.message}`);
    throw new Error("Error while embedding locally" + error);
  }
};

// Text splitter for code optimization
const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 1000,
  chunkOverlap: 200,
  separators: ["\n\n", "\n", " ", ""],
});

interface GitHubFile {
  name: string;
  path: string;
  type: string;
  size?: number;
  download_url?: string;
  content?: string;
  encoding?: string;
}

interface ProcessedCodeChunk {
  content: string;
  metadata: {
    filePath: string;
    fileName: string;
    fileType: string;
    chunkIndex: number;
    repository: string;
    owner: string;
  };
}

export class GitHubCodeProcessor {
  private accessToken: string;
  private owner: string;
  private repo: string;

  constructor(accessToken: string, owner: string, repo: string) {
    this.accessToken = accessToken;
    this.owner = owner;
    this.repo = repo;
  }

  // Fetch repository contents recursively
  async fetchRepositoryContents(path: string = ""): Promise<GitHubFile[]> {
    try {
      const response = await fetch(
        `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${path}`,
        {
          headers: {
            Authorization: `token ${this.accessToken}`,
            "Content-Type": "application/json",
            "User-Agent": "GitHub-Code-Processor",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const data = await response.json();
      const files: GitHubFile[] = [];

      for (const item of data) {
        if (item.type === "file") {
          // Skip binary files and large files
          if (this.shouldProcessFile(item)) {
            files.push(item);
          }
        } else if (item.type === "dir") {
          // Recursively fetch subdirectory contents
          const subFiles = await this.fetchRepositoryContents(item.path);
          files.push(...subFiles);
        }
      }

      return files;
    } catch (error: any) {
      console.error(`Error fetching contents for path ${path}:`, error.message);
      return [];
    }
  }

  // Check if file should be processed
  private shouldProcessFile(file: GitHubFile): boolean {
    const codeExtensions = [
      ".js",
      ".ts",
      ".jsx",
      ".tsx",
      ".py",
      ".java",
      ".cpp",
      ".c",
      ".cs",
      ".php",
      ".rb",
      ".go",
      ".rs",
      ".swift",
      ".kt",
      ".scala",
      ".html",
      ".css",
      ".scss",
      ".sass",
      ".less",
      ".vue",
      ".svelte",
      ".json",
      ".xml",
      ".yaml",
      ".yml",
      ".md",
      ".txt",
      ".sql",
      ".sh",
      ".bash",
    ];

    const binaryExtensions = [
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".svg",
      ".ico",
      ".pdf",
      ".zip",
      ".tar",
      ".gz",
      ".exe",
      ".dll",
      ".so",
      ".dylib",
      ".bin",
      ".dat",
    ];

    const extension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."));

    // Skip binary files
    if (binaryExtensions.includes(extension)) {
      return false;
    }

    // Skip very large files (>1MB)
    if (file.size && file.size > 1024 * 1024) {
      return false;
    }

    // Skip node_modules, .git, and other common directories
    if (
      file.path.includes("node_modules") ||
      file.path.includes(".git") ||
      file.path.includes("dist") ||
      file.path.includes("build") ||
      file.path.includes(".next") ||
      file.path.includes("coverage")
    ) {
      return false;
    }

    return codeExtensions.includes(extension) || file.name === "README.md";
  }

  // Fetch file content
  async fetchFileContent(file: GitHubFile): Promise<string> {
    try {
      if (file.download_url) {
        const response = await fetch(file.download_url, {
          headers: {
            Authorization: `token ${this.accessToken}`,
            "User-Agent": "GitHub-Code-Processor",
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status}`);
        }

        // Ensure we return a string
        const data = await response.text();
        if (typeof data === "string") {
          return data;
        } else if (typeof data === "object") {
          // For JSON files, stringify them
          return JSON.stringify(data, null, 2);
        } else {
          // Convert other types to string
          return String(data);
        }
      }
      return "";
    } catch (error: any) {
      console.error(`Error fetching content for ${file.path}:`, error.message);
      return "";
    }
  }

  // Optimize and preprocess code content
  private optimizeCodeContent(content: string, filePath: string): string {
    // Ensure content is a string
    if (typeof content !== "string") {
      content = String(content);
    }

    // Remove excessive whitespace and comments for better embedding
    let optimized = content
      .replace(/\/\*[\s\S]*?\*\//g, "") // Remove block comments
      .replace(/\/\/.*$/gm, "") // Remove line comments
      .replace(/\s+/g, " ") // Normalize whitespace
      .trim();

    // Add file context
    optimized = `File: ${filePath}\n\n${optimized}`;

    return optimized;
  }

  // Process and chunk code files
  async processCodeFiles(files: GitHubFile[]): Promise<ProcessedCodeChunk[]> {
    const chunks: ProcessedCodeChunk[] = [];

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.path}`);
        const content = await this.fetchFileContent(file);
        if (!content) {
          console.log(`Skipping empty file: ${file.path}`);
          continue;
        }

        // Validate content length
        if (content.length > 1000000) {
          // 1MB limit
          console.log(
            `Skipping large file: ${file.path} (${content.length} chars)`
          );
          continue;
        }

        const optimizedContent = this.optimizeCodeContent(content, file.path);

        // Split content into chunks
        const textChunks = await textSplitter.splitText(optimizedContent);

        textChunks.forEach((chunk: string, index: number) => {
          chunks.push({
            content: chunk,
            metadata: {
              filePath: file.path,
              fileName: file.name,
              fileType: file.name.substring(file.name.lastIndexOf(".") + 1),
              chunkIndex: index,
              repository: this.repo,
              owner: this.owner,
            },
          });
        });

        console.log(`✅ Processed ${file.path}: ${textChunks.length} chunks`);
      } catch (error: any) {
        console.error(`❌ Error processing file ${file.path}:`, error.message);
        // Continue processing other files
        continue;
      }
    }

    return chunks;
  }

  // Generate embeddings and store in Qdrant
  async embedAndStore(chunks: ProcessedCodeChunk[]): Promise<void> {
    const collectionName = `${this.owner}_${this.repo}`
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, "_");

    try {
      // Chroma embeddings don't require API keys - they run locally

      if (!process.env.QDRANT_URL && !process.env.QDRANT_API_KEY) {
        console.warn(
          "QDRANT_URL or QDRANT_API_KEY not set, using default localhost connection"
        );
      }

      // Test Qdrant connection
      try {
        await qdrantClient.getCollections();
        console.log("✅ Qdrant connection successful");
      } catch (error: any) {
        console.error("❌ Qdrant connection failed:", error.message);
        throw new Error(`Failed to connect to Qdrant: ${error.message}`);
      }

      // Handle collection creation/cleanup more robustly
      try {
        // First, try to delete existing collection to avoid conflicts
        try {
          await qdrantClient.deleteCollection(collectionName);
          console.log(`🗑️ Deleted existing collection: ${collectionName}`);
        } catch (deleteError: any) {
          // Collection might not exist, that's fine
          console.log(`Collection ${collectionName} doesn't exist yet`);
        }

        // Create fresh collection
        await qdrantClient.createCollection(collectionName, {
          vectors: {
            size: 384,
            distance: "Cosine",
          }, // Size for Chroma embeddings
        });
        console.log(`✅ Created collection: ${collectionName}`);
      } catch (error: any) {
        console.error(`❌ Collection creation failed: ${error.message}`);
        throw new Error(`Failed to create collection: ${error.message}`);
      }

      // Process chunks in batches with proper error handling
      const batchSize = 5;
      let successfulBatches = 0;
      let totalBatches = Math.ceil(chunks.length / batchSize);

      console.log(
        `🚀 Processing ${chunks.length} chunks in ${totalBatches} batches`
      );

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        const batchNumber = Math.floor(i / batchSize) + 1;

        try {
          console.log(
            `⚡ Batch ${batchNumber}/${totalBatches}: Processing ${batch.length} chunks`
          );

          const texts = batch.map((chunk) => chunk.content);
          const embeddings_result = await generateEmbeddings(texts);

          console.log(
            `✅ Generated ${embeddings_result.length} embeddings for batch ${batchNumber}`
          );

          // Prepare points for Qdrant with proper ID generation (Qdrant needs integer IDs)
          const points = batch.map((chunk, index) => {
            // Generate a unique integer ID based on content hash
            const contentHash = chunk.content.split("").reduce((a, b) => {
              a = (a << 5) - a + b.charCodeAt(0);
              return a & a;
            }, 0);
            const uniqueId = Math.abs(contentHash) + Date.now() + index;

            return {
              id: uniqueId,
              vector: embeddings_result[index],
              payload: {
                content: chunk.content,
                filePath: chunk.metadata.filePath,
                fileName: chunk.metadata.fileName,
                fileType: chunk.metadata.fileType,
                chunkIndex: chunk.metadata.chunkIndex,
                repository: chunk.metadata.repository,
                owner: chunk.metadata.owner,
                processedAt: new Date().toISOString(),
              },
            };
          });

          console.log(`🔍 Storing ${points.length} points in Qdrant...`);

          // Store in Qdrant with proper error handling
          await qdrantClient.upsert(collectionName, {
            wait: true,
            points: points,
          });

          console.log(
            `✅ Successfully stored ${points.length} points in Qdrant`
          );

          successfulBatches++;
          console.log(
            `✅ Batch ${batchNumber}/${totalBatches} completed successfully`
          );
        } catch (batchError: any) {
          console.error(`❌ Batch ${batchNumber} failed:`, batchError.message);
          console.error(`❌ Full error:`, batchError);
          // Continue with next batch
          continue;
        }
      }

      // Report actual results
      console.log(
        `📊 Final Results: ${successfulBatches}/${totalBatches} batches successful`
      );

      if (successfulBatches === 0) {
        throw new Error("All batches failed - no data was stored");
      }

      console.log(
        `Successfully embedded and stored ${chunks.length} chunks for ${this.owner}/${this.repo}`
      );
    } catch (error: any) {
      console.error("Error embedding and storing chunks:", error.message);

      // Clean up: Delete the empty collection if data insertion failed
      try {
        await qdrantClient.deleteCollection(collectionName);
        console.log(`🗑️ Cleaned up empty collection: ${collectionName}`);
      } catch (deleteError: any) {
        console.error("Failed to delete collection:", deleteError.message);
      }

      throw error;
    }
  }

  // Main processing method
  async processRepository(): Promise<{
    success: boolean;
    chunksProcessed: number;
    message: string;
  }> {
    try {
      console.log(
        `Starting repository processing for ${this.owner}/${this.repo}`
      );

      // Fetch all repository contents
      const files = await this.fetchRepositoryContents();
      console.log(`Found ${files.length} files to process`);

      if (files.length === 0) {
        return {
          success: false,
          chunksProcessed: 0,
          message: "No files found to process",
        };
      }

      // Process and chunk code files
      const chunks = await this.processCodeFiles(files);
      console.log(
        `Generated ${chunks.length} chunks from ${files.length} files`
      );

      if (chunks.length === 0) {
        return {
          success: false,
          chunksProcessed: 0,
          message: "No code chunks generated",
        };
      }

      // Embed and store in Qdrant
      await this.embedAndStore(chunks);

      return {
        success: true,
        chunksProcessed: chunks.length,
        message: `Successfully processed ${chunks.length} code chunks from ${files.length} files`,
      };
    } catch (error: any) {
      console.error("Repository processing failed:", error.message);

      // Clean up any partial collections
      try {
        const collectionName = `${this.owner}_${this.repo}`
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "_");
        await qdrantClient.deleteCollection(collectionName);
        console.log(`🗑️ Cleaned up failed collection: ${collectionName}`);
      } catch (cleanupError: any) {
        console.error("Failed to cleanup collection:", cleanupError.message);
      }

      return {
        success: false,
        chunksProcessed: 0,
        message: `Processing failed: ${error.message}`,
      };
    }
  }
}
