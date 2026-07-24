import React, { useState, useEffect, useRef } from 'react';
import { Camera, Check, CheckCircle2, Download, Printer, XCircle, AlertCircle, Trash2, CloudUpload, Loader2, Menu, X, FileText, Plus, LogOut } from 'lucide-react';
import { db, storage, auth } from './firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import Login from './components/Login';
import { collection, addDoc, updateDoc, doc, getDocs, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

const INSPECTION_SECTIONS = [
  {
    id: 'workmanship',
    title: 'Workmanship (Physical Installation)',
    items: [
      { id: 'AP1', title: 'Indoor Access Point 1 (AP1)', desc: 'Mounted securely on designated spot. Verify optimal scattering for coverage limit of UTP.' },
      { id: 'AP2', title: 'Indoor Access Point 2 (AP2)', desc: 'Mounted securely. Verified distance from AP1 to ensure maximum Wi-Fi spread across classrooms.' },
      { id: 'AP3', title: 'Outdoor Access Point (AP3)', desc: 'Mounted securely on exterior spot. CMX-rated cable protected with 20mm conduit.' },
      { id: 'COMM', title: 'Commbox and Contents', desc: 'Securely mounted at least 6ft high. Ruijie Router and Starlink power supply neatly organized inside.' },
      { id: 'STARLINK', title: 'Starlink Antenna', desc: 'Rooftop or pole mounted securely with proper brackets. Verified to withstand strong winds and clear of obstructions.' },
      { id: 'POWER', title: 'Power System', desc: 'Dedicated 20A breaker tapped properly. Grounded and connected to internal PDU outlet.' },
      { id: 'POWERCABLING', title: 'Power Cabling', desc: 'Power cables must be neatly routed and fully enclosed with proper ducting.' },
      { id: 'CABLING', title: 'Network Cabling', desc: 'Cables neatly dressed with ties. Indoor runs secured with clips every 0.5m. Outdoor runs inside conduit.' },
    ]
  },
  {
    id: 'functionality',
    title: 'Functionality & Visibility',
    items: [
      { id: 'SPEED', title: 'Speed Test', desc: 'DL: 40–220 Mbps, UL: 10–30 Mbps, Latency: 25–60ms. Verified at different locations.' },
      { id: 'NMS', title: 'NMS Visibility', desc: 'Ruijie Router and APs have valid IPs and are verified visible/active by Comclark NOC.' },
    ]
  }
];

const ChecklistItem = ({ item, data, onChange, isReadOnly }) => {
  const [uploadingIndex, setUploadingIndex] = useState(null);
  const [fullscreenPhoto, setFullscreenPhoto] = useState(null);

  const handleStatus = (status) => !isReadOnly && onChange({ ...data, status });
  const handleComment = (e) => !isReadOnly && onChange({ ...data, comments: e.target.value });
  
  // Backwards compatibility for old records
  const getPhotosArray = () => {
    if (data?.photos) return data.photos;
    if (data?.photo) return [{ url: data.photo, refPath: data.photoRefPath }];
    return [];
  };
  const photos = getPhotosArray();

  const handlePhotoUpload = async (e, index) => {
    if (isReadOnly) return;
    const file = e.target.files[0];
    if (!file) return;

    setUploadingIndex(index);
    const safeName = (file.name || 'photo.jpg').replace(/[^a-zA-Z0-9.]/g, '_');
    const fileName = `${Date.now()}_${safeName}`;
    const fileRef = ref(storage, `photos/${fileName}`);
    
    try {
      const snapshot = await uploadBytes(fileRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      const newPhotos = [...photos];
      newPhotos[index] = { url: downloadURL, refPath: `photos/${fileName}` };
      onChange({ ...data, photos: newPhotos });
    } catch (error) {
      console.error("Upload failed", error);
      alert(`Photo upload failed: ${error.message || 'Unknown error. Check internet or permissions.'}`);
    } finally {
      setUploadingIndex(null);
    }
  };

  const removePhoto = async (index) => {
    if (isReadOnly) return;
    
    const photoToDelete = photos[index];
    if (!photoToDelete) return;

    if (photoToDelete.refPath) {
      try {
        const fileRef = ref(storage, photoToDelete.refPath);
        await deleteObject(fileRef);
      } catch (e) {
        console.error("Failed to delete photo from storage", e);
      }
    }
    
    const newPhotos = [...photos];
    newPhotos[index] = null;
    onChange({ ...data, photos: newPhotos });
  };

  return (
    <div className="bg-surface rounded-lg shadow-sm p-4 mb-4 border border-[var(--border)] animate-fade-in print-page-item">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-lg">{item.title}</h3>
          <p className="text-secondary text-sm mt-1">{item.desc}</p>
        </div>
      </div>
      
      <div className="mt-4 flex flex-col gap-4 print-flex-1">
        <div className="flex-1 flex flex-col print-flex-none">
          <div className="status-group mb-4">
            <button 
              onClick={() => handleStatus('pass')} 
              className={`status-btn pass flex items-center justify-center gap-1 ${data?.status === 'pass' ? 'active' : ''}`}
            >
              <CheckCircle2 size={16} /> Pass
            </button>
            <button 
              onClick={() => handleStatus('fail')} 
              className={`status-btn fail flex items-center justify-center gap-1 ${data?.status === 'fail' ? 'active' : ''}`}
            >
              <XCircle size={16} /> Fail
            </button>
            <button 
              onClick={() => handleStatus('na')} 
              className={`status-btn na flex items-center justify-center gap-1 ${data?.status === 'na' ? 'active' : ''}`}
            >
              <AlertCircle size={16} /> N/A
            </button>
          </div>

          <textarea 
            placeholder="Add comments or notes..." 
            rows={3} 
            value={data?.comments || ''} 
            onChange={handleComment}
            readOnly={isReadOnly}
            className="w-full min-h-100 print-textarea"
          />
        </div>

        {/* 2x2 Photo Grid */}
        <div className="grid grid-cols-2 gap-4 print-photo-grid">
          {[0, 1, 2, 3].map(index => {
            const photoData = photos[index];
            const isThisUploading = uploadingIndex === index;
            
            return (
              <div key={index} className="w-full min-h-160 flex flex-col shrink-0 justify-center">
                {photoData?.url ? (
                  <div className="relative h-full min-h-160 rounded-lg overflow-hidden border border-[var(--border)] bg-gray-100 flex items-center justify-center">
                    <img 
                      src={photoData.url} 
                      alt={`${item.title} Proof ${index + 1}`} 
                      className="photo-preview-img print-photo" 
                      onClick={() => setFullscreenPhoto(photoData.url)}
                    />
                    {!isReadOnly && (
                      <button 
                        onClick={() => removePhoto(index)}
                        className="btn-delete-photo no-print"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Interactive upload box for screen */}
                    <div 
                      className={`photo-upload h-full flex flex-col items-center justify-center text-secondary no-print ${isThisUploading ? 'opacity-50 cursor-wait' : ''}`}
                      onClick={() => !isReadOnly && !isThisUploading && setUploadingIndex(index + '-prompt')}
                    >
                      {isThisUploading ? (
                        <>
                          <Loader2 size={24} className="mb-2 animate-spin text-primary" />
                          <span className="text-sm font-semibold text-primary text-center">Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Camera size={24} className="mb-2" />
                          <span className="text-sm text-center">Tap to add photo {index + 1}</span>
                        </>
                      )}
                    </div>
                    {/* Placeholder box for print */}
                    <div className="hidden print-flex items-center justify-center border border-dashed border-gray-300 rounded-lg bg-gray-50 h-full min-h-160 print-photo-placeholder">
                      <span className="text-secondary text-sm">Photo {index + 1} Placeholder</span>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {typeof uploadingIndex === 'string' && uploadingIndex.endsWith('-prompt') && (
        <div className="modal-overlay no-print">
          <div className="modal-card">
            <h3 className="modal-title">Add Photo</h3>
            <div className="modal-actions">
              <div className="modal-action-btn">
                <Camera size={32} className="modal-icon text-primary" />
                <span className="modal-label">Take Photo</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment" 
                  onChange={(e) => { setUploadingIndex(null); handlePhotoUpload(e, parseInt(uploadingIndex)); }} 
                  className="modal-file-input"
                />
              </div>
              <div className="modal-action-btn">
                <CloudUpload size={32} className="modal-icon text-secondary" />
                <span className="modal-label">Gallery Upload</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => { setUploadingIndex(null); handlePhotoUpload(e, parseInt(uploadingIndex)); }} 
                  className="modal-file-input"
                />
              </div>
            </div>
            <button 
              onClick={() => setUploadingIndex(null)}
              className="modal-cancel-btn"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {fullscreenPhoto && (
        <div className="lightbox no-print" onClick={() => setFullscreenPhoto(null)}>
          <img src={fullscreenPhoto} alt="Fullscreen proof" onClick={(e) => e.stopPropagation()} />
          <button className="lightbox-close" onClick={() => setFullscreenPhoto(null)}>
            <XCircle size={32} />
          </button>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [projectInfo, setProjectInfo] = useState({ 
    schoolName: '', 
    beisId: '',
    siteCode: '',
    inspectorName: '', 
    date: new Date().toISOString().split('T')[0] 
  });
  const [checklistData, setChecklistData] = useState({});
  const [defectsData, setDefectsData] = useState(() => Array.from({ length: 10 }, () => ({ description: '', severity: '' })));
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sidebar and Viewer State
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [historyList, setHistoryList] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [viewingMode, setViewingMode] = useState('new'); // 'new' or 'history'
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);
  const [currentRecordOwner, setCurrentRecordOwner] = useState(null);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Failed to sign out", error);
    }
  };

  // Load from local storage on mount (only for 'new' draft mode)
  useEffect(() => {
    if (viewingMode === 'history') return;
    
    const saved = localStorage.getItem('qualityInspectionDataV2');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.projectInfo) setProjectInfo(parsed.projectInfo);
      if (parsed.checklistData) setChecklistData(parsed.checklistData);
      if (parsed.defectsData) setDefectsData(parsed.defectsData);
    }
  }, []);

  // Save to local storage on changes (Draft auto-save) ONLY if in new mode
  useEffect(() => {
    if (viewingMode === 'history') return;
    try {
      localStorage.setItem('qualityInspectionDataV2', JSON.stringify({ projectInfo, checklistData, defectsData }));
    } catch (e) {
      console.error("Local storage error:", e);
    }
  }, [projectInfo, checklistData, defectsData, viewingMode]);

  const fetchHistory = async () => {
    setIsLoadingHistory(true);
    try {
      const q = query(collection(db, "inspections"), orderBy("submittedAt", "desc"));
      const querySnapshot = await getDocs(q);
      const docs = [];
      querySnapshot.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      setHistoryList(docs);
    } catch (error) {
      console.error("Error fetching history: ", error);
    }
    setIsLoadingHistory(false);
  };

  const handleOpenSidebar = () => {
    setIsSidebarOpen(true);
    fetchHistory();
  };

  const loadHistoryItem = (item) => {
    setViewingMode('history');
    setSelectedHistoryItem(item.id);
    setCurrentRecordOwner(item.creatorUid || null);
    setProjectInfo(item.projectInfo || {});
    setChecklistData(item.checklistData || {});
    setDefectsData(item.defectsData || Array.from({ length: 10 }, () => ({ description: '', severity: '' })));
    setIsSidebarOpen(false);
  };

  const startNewInspection = () => {
    setViewingMode('new');
    setSelectedHistoryItem(null);
    setCurrentRecordOwner(null);
    // Reload draft from local storage
    const saved = localStorage.getItem('qualityInspectionDataV2');
    if (saved) {
      const parsed = JSON.parse(saved);
      setProjectInfo(parsed.projectInfo || { schoolName: '', beisId: '', siteCode: '', inspectorName: '', date: new Date().toISOString().split('T')[0] });
      setChecklistData(parsed.checklistData || {});
      setDefectsData(parsed.defectsData || Array.from({ length: 10 }, () => ({ description: '', severity: '' })));
    } else {
      setProjectInfo({ schoolName: '', beisId: '', siteCode: '', inspectorName: '', date: new Date().toISOString().split('T')[0] });
      setChecklistData({});
      setDefectsData(Array.from({ length: 10 }, () => ({ description: '', severity: '' })));
    }
    setIsSidebarOpen(false);
  };

  const handleItemChange = (itemId, data) => {
    setChecklistData(prev => ({ ...prev, [itemId]: data }));
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClear = () => {
    if (window.confirm("Are you sure you want to clear all data? This cannot be undone.")) {
      setProjectInfo({ schoolName: '', beisId: '', siteCode: '', inspectorName: '', date: new Date().toISOString().split('T')[0] });
      setChecklistData({});
      setDefectsData(Array.from({ length: 10 }, () => ({ description: '', severity: '' })));
      localStorage.removeItem('qualityInspectionDataV2');
    }
  };

  const handleSubmitToCloud = async () => {
    if (!projectInfo.siteCode || !projectInfo.schoolName) {
      alert("Please enter at least the School Name and Site Code before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (viewingMode === 'history' && selectedHistoryItem) {
        // Update existing document
        const docRef = doc(db, "inspections", selectedHistoryItem);
        await updateDoc(docRef, {
          projectInfo,
          checklistData,
          defectsData,
          updatedAt: serverTimestamp()
        });
        alert("Success! Inspection report has been updated in the cloud.");
      } else {
        // Create new document
        const docRef = await addDoc(collection(db, "inspections"), {
          projectInfo,
          checklistData,
          defectsData,
          creatorUid: user.uid,
          creatorEmail: user.email,
          submittedAt: serverTimestamp()
        });
        
        // Switch to history mode to track this new record
        setViewingMode('history');
        setSelectedHistoryItem(docRef.id);
        setCurrentRecordOwner(user.uid);
        alert("Success! Inspection report has been saved to the Firebase Cloud Database.");
      }
    } catch (error) {
      console.error("Error writing document: ", error);
      alert("Failed to save to database. Please check your network and try again.");
    }
    setIsSubmitting(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const isFormReadOnly = viewingMode === 'history' && currentRecordOwner !== user.uid;

  return (
    <div className="min-h-screen">
      {/* Sidebar Overlay */}
      <div 
        className={`sidebar-overlay no-print ${isSidebarOpen ? 'open' : ''}`} 
        onClick={() => setIsSidebarOpen(false)} 
      />
      
      {/* Sidebar Panel */}
      <div className={`sidebar no-print ${isSidebarOpen ? 'open' : ''}`}>
        <div className="p-4 border-b border-[var(--border)] flex justify-between items-center bg-primary text-white">
          <h2 className="text-lg font-bold">Past Submissions</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="text-white hover:text-gray-200">
            <X size={24} />
          </button>
        </div>
        
        <div className="p-4 border-b border-[var(--border)]">
          <button onClick={startNewInspection} className="btn w-full flex items-center justify-center gap-2 mb-2">
            <Plus size={16} /> New Inspection
          </button>
          <button onClick={handleSignOut} className="btn btn-outline w-full flex items-center justify-center gap-2 border-danger text-danger hover:bg-danger/10">
            <LogOut size={16} /> Sign Out
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoadingHistory ? (
            <div className="flex flex-col items-center justify-center p-8 text-secondary">
              <Loader2 size={32} className="animate-spin mb-2" />
              <p>Loading records...</p>
            </div>
          ) : historyList.length === 0 ? (
            <div className="p-8 text-center text-secondary">
              <p>No past inspections found.</p>
            </div>
          ) : (
            historyList.map(item => (
              <div 
                key={item.id} 
                className={`history-item ${selectedHistoryItem === item.id ? 'active' : ''}`}
                onClick={() => loadHistoryItem(item)}
              >
                <div className="font-bold text-primary mb-1">{item.projectInfo?.siteCode || 'Unknown Site'}</div>
                <div className="text-sm font-semibold truncate">{item.projectInfo?.schoolName || 'Unknown School'}</div>
                <div className="text-xs text-secondary mt-2 flex justify-between">
                  <span>{item.projectInfo?.date || ''}</span>
                  <span>{item.projectInfo?.inspectorName || ''}</span>
                </div>
                <div className="text-[10px] text-secondary/70 mt-1 pt-1 border-t border-[var(--border)] italic">
                  Created by: {item.creatorEmail || 'Unknown'}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <header className="glass no-print">
        <div className="container flex justify-between items-center py-2">
          <div className="flex items-center gap-3">
            <button onClick={handleOpenSidebar} className="p-2 -ml-2 rounded-lg hover:bg-gray-100 transition-colors">
              <Menu size={24} className="text-primary" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-primary">DICT E-Learning</h1>
              <p className="text-sm text-secondary font-semibold">Quality Inspection App</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSignOut} className="btn btn-outline text-sm border-danger text-danger hover:bg-danger/10" title="Sign Out">
              <LogOut size={16} />
            </button>
            <button onClick={handlePrint} className="btn btn-outline text-sm">
              <Printer size={16} /> Print / PDF
            </button>
            <button onClick={handleSubmitToCloud} disabled={isSubmitting} className="btn text-sm flex items-center gap-1">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />} 
              {isSubmitting ? 'Saving...' : (viewingMode === 'history' ? 'Update Cloud Record' : 'Submit to Cloud')}
            </button>
          </div>
        </div>
      </header>

      {/* Print-only Header */}
      <div className="hidden print-block text-center mb-6 border-b-2 border-black pb-4">
        <h1 className="text-2xl font-bold uppercase">DICT E-Learning Connectivity Enhancement</h1>
        <h2 className="text-xl font-bold mt-1">Quality Inspection Report</h2>
      </div>

      <main className="container pt-6 pb-20 print-pt-0">
        <section className="bg-surface rounded-lg shadow-md p-6 mb-8 border border-[var(--border)] print-no-shadow print-border-black">
          <h2 className="text-lg font-bold mb-4 border-b border-[var(--border)] pb-2 print-border-black">Site Information</h2>
          <div className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-semibold text-secondary mb-1 block print-text-black">School Name</label>
              <input 
                type="text" 
                value={projectInfo.schoolName} 
                onChange={e => setProjectInfo({...projectInfo, schoolName: e.target.value})} 
                placeholder="e.g. San Jose National High School"
                className="print-input"
                disabled={isFormReadOnly}
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full">
                <label className="text-sm font-semibold text-secondary mb-1 block print-text-black">BEIS ID</label>
                <input 
                  type="text" 
                  value={projectInfo.beisId} 
                  onChange={e => setProjectInfo({...projectInfo, beisId: e.target.value})} 
                  placeholder="e.g. 104523"
                  className="print-input"
                  disabled={isFormReadOnly}
                />
              </div>
              <div className="w-full">
                <label className="text-sm font-semibold text-secondary mb-1 block print-text-black">Site Code</label>
                <input 
                  type="text" 
                  value={projectInfo.siteCode} 
                  onChange={e => setProjectInfo({...projectInfo, siteCode: e.target.value})} 
                  placeholder="e.g. REG3-PMP-001"
                  className="print-input"
                  disabled={isFormReadOnly}
                />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="w-full">
                <label className="text-sm font-semibold text-secondary mb-1 block print-text-black">Inspector Name</label>
                <input 
                  type="text" 
                  value={projectInfo.inspectorName} 
                  onChange={e => setProjectInfo({...projectInfo, inspectorName: e.target.value})} 
                  placeholder="John Doe"
                  className="print-input"
                  disabled={isFormReadOnly}
                />
              </div>
              <div className="w-full">
                <label className="text-sm font-semibold text-secondary mb-1 block print-text-black">Date</label>
                <input 
                  type="date" 
                  value={projectInfo.date} 
                  onChange={e => setProjectInfo({...projectInfo, date: e.target.value})} 
                  className="print-input"
                  disabled={isFormReadOnly}
                />
              </div>
            </div>
          </div>
        </section>

        {INSPECTION_SECTIONS.map((section) => (
          <section key={section.id} className="mb-8 print-section">
            <h2 className="text-xl font-bold mb-4 text-primary bg-primary/10 inline-block px-3 py-1 rounded-lg print-bg-none print-text-black print-border-b print-w-full">
              {section.title}
            </h2>
            <div className="flex flex-col gap-2">
              {section.items.map((item) => (
                <ChecklistItem 
                  key={item.id} 
                  item={item} 
                  data={checklistData[item.id] || {}} 
                  onChange={(data) => handleItemChange(item.id, data)}
                  isReadOnly={isFormReadOnly}
                />
              ))}
            </div>
          </section>
        ))}

        {/* Defects Section */}
        <section className="mb-8 print-section" style={{ pageBreakBefore: 'always' }}>
          <h2 className="text-xl font-bold mb-4 text-primary bg-primary/10 inline-block px-3 py-1 rounded-lg print-bg-none print-text-black print-border-b print-w-full">
            Summary of Defects
          </h2>
          <div className="bg-surface rounded-lg shadow-sm border border-[var(--border)] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-[var(--border)] print-bg-none">
                  <th className="p-3 font-semibold text-secondary w-12 text-center print-text-black border-r border-[var(--border)]">#</th>
                  <th className="p-3 font-semibold text-secondary print-text-black border-r border-[var(--border)]">Defect Description</th>
                  <th className="p-3 font-semibold text-secondary w-40 text-center print-text-black">Severity</th>
                </tr>
              </thead>
              <tbody>
                {defectsData.map((defect, index) => (
                  <tr key={index} className="border-b border-[var(--border)] last:border-b-0">
                    <td className="p-3 text-center text-secondary border-r border-[var(--border)]">{index + 1}</td>
                    <td className="p-3 border-r border-[var(--border)]">
                      <input 
                        type="text" 
                        value={defect.description} 
                        onChange={(e) => {
                          const newData = [...defectsData];
                          newData[index].description = e.target.value;
                          setDefectsData(newData);
                        }}
                        placeholder="Describe defect..."
                        className="w-full bg-transparent border-0 focus:ring-0 p-0"
                        disabled={isFormReadOnly}
                      />
                    </td>
                    <td className="p-3">
                      <select
                        value={defect.severity}
                        onChange={(e) => {
                          const newData = [...defectsData];
                          newData[index].severity = e.target.value;
                          setDefectsData(newData);
                        }}
                        className="w-full bg-transparent border border-[var(--border)] rounded p-1 text-sm appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isFormReadOnly}
                      >
                        <option value="">Select...</option>
                        <option value="Minor">Minor</option>
                        <option value="Major">Major</option>
                        <option value="Critical">Critical</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 print-mt-4">
            <h3 className="font-bold mb-2">Defect Counts</h3>
            <div className="flex gap-4">
              <div className="flex-1 bg-surface border border-[var(--border)] rounded-lg p-4 text-center">
                <div className="text-secondary text-sm font-semibold mb-1">Minor</div>
                <div className="text-2xl font-bold">{defectsData.filter(d => d.severity === 'Minor').length}</div>
              </div>
              <div className="flex-1 bg-surface border border-[var(--border)] rounded-lg p-4 text-center">
                <div className="text-secondary text-sm font-semibold mb-1">Major</div>
                <div className="text-2xl font-bold">{defectsData.filter(d => d.severity === 'Major').length}</div>
              </div>
              <div className="flex-1 bg-surface border border-[var(--border)] rounded-lg p-4 text-center">
                <div className="text-secondary text-sm font-semibold mb-1">Critical</div>
                <div className="text-2xl font-bold">{defectsData.filter(d => d.severity === 'Critical').length}</div>
              </div>
            </div>
          </div>
        </section>

        {viewingMode === 'new' ? (
          <div className="mt-8 pt-8 border-t border-[var(--border)] flex justify-between items-center no-print">
            <button onClick={handleClear} className="btn btn-outline text-danger border-danger hover:bg-danger/10">
              <Trash2 size={16} /> Clear All Data
            </button>
            <button onClick={handleSubmitToCloud} disabled={isSubmitting} className="btn">
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />} 
              {isSubmitting ? 'Saving...' : 'Submit to Cloud'}
            </button>
          </div>
        ) : (
          <div className="mt-8 pt-8 border-t border-[var(--border)] flex justify-between items-center no-print">
            <button onClick={startNewInspection} className="btn btn-outline">
              <Plus size={16} /> Start New Draft
            </button>
            {!isFormReadOnly && (
              <button onClick={handleSubmitToCloud} disabled={isSubmitting} className="btn">
                {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CloudUpload size={16} />} 
                {isSubmitting ? 'Saving...' : 'Update Cloud Record'}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
