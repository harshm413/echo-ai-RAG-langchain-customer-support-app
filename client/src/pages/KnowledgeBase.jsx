import { useState, useEffect } from 'react'
import { 
  PlusIcon, 
  DocumentIcon, 
  TrashIcon, 
  CloudArrowUpIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  PhotoIcon,
  DocumentArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import LoadingSpinner from '../components/LoadingSpinner'
import { knowledgeBaseAPI } from '../services/api'
import toast from 'react-hot-toast'

export default function KnowledgeBase() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [dragActive, setDragActive] = useState(false)

  // Refresh documents when search or filter changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchDocuments()
    }, 500) // Debounce search
    
    return () => clearTimeout(timeoutId)
  }, [searchTerm, filterType])

  // Auto-refresh every 10 seconds to check for processing updates
  useEffect(() => {
    const interval = setInterval(() => {
      if (documents.some(doc => doc.status === 'processing')) {
        fetchDocuments()
      }
    }, 10000)
    
    return () => clearInterval(interval)
  }, [documents])

  const fetchDocuments = async () => {
    try {
      setLoading(true)
      const response = await knowledgeBaseAPI.getAll({ 
        page: 1, 
        limit: 100,
        ...(filterType !== 'all' && { type: filterType }),
        ...(searchTerm && { search: searchTerm })
      })
      
      // Transform backend data to match frontend format
      const transformedDocs = response.data.documents.map(doc => ({
        _id: doc._id,
        title: doc.title,
        type: doc.metadata?.fileType?.split('/').pop()?.toUpperCase() || doc.type?.toUpperCase() || 'DOCUMENT',
        size: formatFileSize(doc.metadata?.fileSize || 0),
        status: doc.status === 'ready' ? 'processed' : doc.status,
        createdAt: doc.createdAt,
        pages: doc.metadata?.pages || doc.metadata?.chunkCount || 0,
        processed: doc.status === 'ready',
        category: doc.category
      }))
      
      setDocuments(transformedDocs)
    } catch (error) {
      console.error('Error fetching documents:', error)
      toast.error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return

    setUploading(true)
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const formData = new FormData()
        formData.append('document', file)
        formData.append('title', file.name)
        formData.append('category', 'general')
        
        const response = await knowledgeBaseAPI.upload(formData)
        toast.success(`${file.name} uploaded successfully and is being processed`)
      }
      
      // Refresh the documents list
      await fetchDocuments()
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload files')
    } finally {
      setUploading(false)
      setShowUploadModal(false)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const deleteDocument = async (id) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    
    try {
      await knowledgeBaseAPI.delete(id)
      setDocuments(prev => prev.filter(doc => doc._id !== id))
      toast.success('Document deleted successfully')
    } catch (error) {
      console.error('Delete error:', error)
      toast.error('Failed to delete document')
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files)
    }
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = filterType === 'all' || doc.type.toLowerCase() === filterType.toLowerCase()
    return matchesSearch && matchesFilter
  })

  const getFileIcon = (type) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return DocumentTextIcon
      case 'docx':
      case 'doc':
        return DocumentIcon
      case 'md':
      case 'markdown':
        return DocumentTextIcon
      case 'jpg':
      case 'jpeg':
      case 'png':
        return PhotoIcon
      default:
        return DocumentIcon
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'processed':
        return { bg: 'var(--green-100)', color: 'var(--green-800)' }
      case 'processing':
        return { bg: 'var(--yellow-100)', color: 'var(--yellow-800)' }
      case 'error':
        return { bg: 'var(--red-100)', color: 'var(--red-800)' }
      default:
        return { bg: 'var(--gray-100)', color: 'var(--gray-800)' }
    }
  }

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <LoadingSpinner size="lg" />
          <p style={{ marginTop: '16px', color: 'var(--gray-600)' }}>Loading knowledge base...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="card" style={{ marginBottom: '32px' }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--gray-900)', margin: '0 0 8px 0' }}>
                Knowledge Base
              </h1>
              <p style={{ fontSize: '16px', color: 'var(--gray-600)', margin: 0 }}>
                Train your AI assistant with documents and content. Supported formats: PDF, DOCX, TXT, CSV, JSON, HTML, Markdown
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="btn btn-primary"
            >
              <CloudArrowUpIcon style={{ width: '20px', height: '20px', marginRight: '8px' }} />
              Upload Documents
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4" style={{ marginBottom: '32px' }}>
        {[
          { 
            title: 'Total Documents', 
            value: documents.length, 
            icon: DocumentIcon, 
            color: 'var(--blue-500)' 
          },
          { 
            title: 'Processed', 
            value: documents.filter(d => d.processed).length, 
            icon: CheckCircleIcon, 
            color: 'var(--green-500)' 
          },
          { 
            title: 'Processing', 
            value: documents.filter(d => !d.processed).length, 
            icon: ExclamationTriangleIcon, 
            color: 'var(--yellow-500)' 
          },
          { 
            title: 'Total Pages', 
            value: documents.reduce((sum, doc) => sum + (doc.pages || 0), 0), 
            icon: DocumentTextIcon, 
            color: 'var(--purple-500)' 
          }
        ].map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-card-header">
              <div className="stat-card-icon" style={{ background: stat.color }}>
                <stat.icon />
              </div>
            </div>
            <div>
              <p className="stat-card-title">{stat.title}</p>
              <p className="stat-card-value">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="card" style={{ marginBottom: '24px' }}>
        <div className="card-body">
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, maxWidth: '400px', position: 'relative' }}>
              <MagnifyingGlassIcon style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                color: 'var(--gray-400)'
              }} />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input"
                style={{ paddingLeft: '40px' }}
              />
            </div>
            
            <div style={{ position: 'relative' }}>
              <FunnelIcon style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '16px',
                height: '16px',
                color: 'var(--gray-400)'
              }} />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="input"
                style={{ paddingLeft: '40px', minWidth: '150px' }}
              >
                <option value="all">All Types</option>
                <option value="pdf">PDF</option>
                <option value="docx">DOCX</option>
                <option value="txt">TXT</option>
                <option value="md">Markdown</option>
                <option value="html">HTML</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Grid */}
      <div className="card">
        {filteredDocuments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px' }}>
            <CloudArrowUpIcon style={{
              width: '64px',
              height: '64px',
              color: 'var(--gray-400)',
              margin: '0 auto 16px'
            }} />
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--gray-900)', margin: '0 0 8px 0' }}>
              {searchTerm || filterType !== 'all' ? 'No documents found' : 'No documents uploaded'}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--gray-500)', margin: '0 0 24px 0' }}>
              {searchTerm || filterType !== 'all' 
                ? 'Try adjusting your search or filter criteria.'
                : 'Get started by uploading your first document to train your AI assistant.'
              }
            </p>
            {!searchTerm && filterType === 'all' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="btn btn-primary"
              >
                <CloudArrowUpIcon style={{ width: '16px', height: '16px', marginRight: '8px' }} />
                Upload Your First Document
              </button>
            )}
          </div>
        ) : (
          <div>
            {filteredDocuments.map((doc, index) => {
              const FileIcon = getFileIcon(doc.type)
              const statusColor = getStatusColor(doc.status)
              
              return (
                <div 
                  key={doc._id} 
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '20px 24px',
                    borderBottom: index < filteredDocuments.length - 1 ? '1px solid var(--gray-100)' : 'none',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--gray-50)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      background: 'linear-gradient(135deg, var(--blue-500) 0%, var(--purple-600) 100%)',
                      borderRadius: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '16px',
                      flexShrink: 0
                    }}>
                      <FileIcon style={{ width: '24px', height: '24px', color: 'white' }} />
                    </div>
                    
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{
                        fontSize: '16px',
                        fontWeight: 600,
                        color: 'var(--gray-900)',
                        margin: '0 0 4px 0'
                      }}>
                        {doc.title}
                      </h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <span style={{ fontSize: '14px', color: 'var(--gray-500)' }}>
                          {doc.type} • {doc.size}
                        </span>
                        {doc.pages && (
                          <span style={{ fontSize: '14px', color: 'var(--gray-500)' }}>
                            {doc.pages} pages
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 500,
                          backgroundColor: statusColor.bg,
                          color: statusColor.color,
                          gap: '4px'
                        }}>
                          {doc.status === 'processing' && (
                            <div style={{ width: '8px', height: '8px', backgroundColor: 'currentColor', borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                          )}
                          {doc.status === 'processed' && <CheckCircleIcon style={{ width: '12px', height: '12px' }} />}
                          {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                        </span>
                        <span style={{ fontSize: '12px', color: 'var(--gray-500)' }}>
                          Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      className="btn btn-ghost btn-sm"
                      title="View document"
                    >
                      <EyeIcon style={{ width: '16px', height: '16px' }} />
                    </button>
                    <button
                      onClick={() => deleteDocument(doc._id)}
                      className="btn btn-ghost btn-sm"
                      style={{ color: 'var(--red-500)' }}
                      title="Delete document"
                    >
                      <TrashIcon style={{ width: '16px', height: '16px' }} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          padding: '16px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '24px',
            boxShadow: 'var(--shadow-2xl)',
            maxWidth: '500px',
            width: '100%',
            padding: '32px'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, var(--blue-500) 0%, var(--purple-600) 100%)',
                borderRadius: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <CloudArrowUpIcon style={{ width: '32px', height: '32px', color: 'white' }} />
              </div>
              <h3 style={{ fontSize: '24px', fontWeight: 700, color: 'var(--gray-900)', margin: '0 0 8px 0' }}>
                Upload Documents
              </h3>
              <p style={{ fontSize: '14px', color: 'var(--gray-600)', margin: 0 }}>
                Add files to train your AI assistant
              </p>
            </div>

            <div
              style={{
                border: `2px dashed ${dragActive ? 'var(--blue-500)' : 'var(--gray-300)'}`,
                borderRadius: '16px',
                padding: '32px',
                textAlign: 'center',
                transition: 'all 0.3s ease',
                backgroundColor: dragActive ? 'var(--blue-50)' : 'transparent'
              }}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <DocumentArrowUpIcon style={{ width: '48px', height: '48px', color: 'var(--gray-400)', margin: '0 auto 16px' }} />
              <p style={{ fontSize: '16px', fontWeight: 500, color: 'var(--gray-700)', margin: '0 0 8px 0' }}>
                Drag and drop files here
              </p>
              <p style={{ fontSize: '14px', color: 'var(--gray-500)', margin: '0 0 16px 0' }}>
                or click to browse
              </p>
              <input
                type="file"
                onChange={(e) => handleFileUpload(e.target.files)}
                accept=".pdf,.docx,.txt,.csv,.json,.html,.md,.markdown,text/markdown,text/x-markdown"
                multiple
                style={{ display: 'none' }}
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="btn btn-primary"
                style={{ cursor: 'pointer' }}
              >
                Choose Files
              </label>
              <p style={{ fontSize: '12px', color: 'var(--gray-500)', margin: '16px 0 0 0' }}>
                Supported: PDF, DOCX, TXT, CSV, JSON, HTML, Markdown (Max 10MB each)
              </p>
            </div>

            {uploading && (
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <LoadingSpinner size="sm" />
                <p style={{ fontSize: '14px', color: 'var(--gray-600)', marginTop: '8px' }}>
                  Processing documents...
                </p>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
              <button
                onClick={() => {
                  setShowUploadModal(false)
                  // Refresh documents after a short delay to show processing status
                  setTimeout(() => fetchDocuments(), 1000)
                }}
                className="btn btn-secondary"
                disabled={uploading}
              >
                {uploading ? 'Processing...' : 'Close'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}