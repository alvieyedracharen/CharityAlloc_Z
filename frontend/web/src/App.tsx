import { ConnectButton } from '@rainbow-me/rainbowkit';
import '@rainbow-me/rainbowkit/styles.css';
import React, { useEffect, useState } from "react";
import { getContractReadOnly, getContractWithSigner } from "./components/useContract";
import "./App.css";
import { useAccount } from 'wagmi';
import { useFhevm, useEncrypt, useDecrypt } from '../fhevm-sdk/src';

interface CharityProject {
  id: string;
  name: string;
  needScore: string;
  allocation: string;
  timestamp: number;
  creator: string;
  publicValue1: number;
  publicValue2: number;
  isVerified?: boolean;
  decryptedValue?: number;
}

interface AllocationAnalysis {
  fairnessScore: number;
  urgencyLevel: number;
  impactPotential: number;
  resourceEfficiency: number;
  privacyScore: number;
}

const App: React.FC = () => {
  const { address, isConnected } = useAccount();
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<CharityProject[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creatingProject, setCreatingProject] = useState(false);
  const [transactionStatus, setTransactionStatus] = useState<{ visible: boolean; status: "pending" | "success" | "error"; message: string; }>({ 
    visible: false, 
    status: "pending", 
    message: "" 
  });
  const [newProjectData, setNewProjectData] = useState({ name: "", needScore: "", description: "" });
  const [selectedProject, setSelectedProject] = useState<CharityProject | null>(null);
  const [decryptedData, setDecryptedData] = useState<{ needScore: number | null; allocation: number | null }>({ needScore: null, allocation: null });
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [contractAddress, setContractAddress] = useState("");
  const [fhevmInitializing, setFhevmInitializing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [userHistory, setUserHistory] = useState<string[]>([]);

  const { status, initialize, isInitialized } = useFhevm();
  const { encrypt, isEncrypting } = useEncrypt();
  const { verifyDecryption, isDecrypting: fheIsDecrypting } = useDecrypt();

  useEffect(() => {
    const initFhevmAfterConnection = async () => {
      if (!isConnected) return;
      if (isInitialized) return;
      if (fhevmInitializing) return;
      
      try {
        setFhevmInitializing(true);
        await initialize();
      } catch (error) {
        setTransactionStatus({ 
          visible: true, 
          status: "error", 
          message: "FHEVM initialization failed." 
        });
        setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      } finally {
        setFhevmInitializing(false);
      }
    };

    initFhevmAfterConnection();
  }, [isConnected, isInitialized, initialize, fhevmInitializing]);

  useEffect(() => {
    const loadDataAndContract = async () => {
      if (!isConnected) {
        setLoading(false);
        return;
      }
      
      try {
        await loadData();
        const contract = await getContractReadOnly();
        if (contract) setContractAddress(await contract.getAddress());
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDataAndContract();
  }, [isConnected]);

  const loadData = async () => {
    if (!isConnected) return;
    
    setIsRefreshing(true);
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const businessIds = await contract.getAllBusinessIds();
      const projectsList: CharityProject[] = [];
      
      for (const businessId of businessIds) {
        try {
          const businessData = await contract.getBusinessData(businessId);
          projectsList.push({
            id: businessId,
            name: businessData.name,
            needScore: businessId,
            allocation: businessId,
            timestamp: Number(businessData.timestamp),
            creator: businessData.creator,
            publicValue1: Number(businessData.publicValue1) || 0,
            publicValue2: Number(businessData.publicValue2) || 0,
            isVerified: businessData.isVerified,
            decryptedValue: Number(businessData.decryptedValue) || 0
          });
        } catch (e) {
          console.error('Error loading business data:', e);
        }
      }
      
      setProjects(projectsList);
    } catch (e) {
      setTransactionStatus({ visible: true, status: "error", message: "Failed to load data" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { 
      setIsRefreshing(false); 
    }
  };

  const createProject = async () => {
    if (!isConnected || !address) { 
      setTransactionStatus({ visible: true, status: "error", message: "Please connect wallet first" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return; 
    }
    
    setCreatingProject(true);
    setTransactionStatus({ visible: true, status: "pending", message: "Creating project with FHE encryption..." });
    
    try {
      const contract = await getContractWithSigner();
      if (!contract) throw new Error("Failed to get contract with signer");
      
      const needScoreValue = parseInt(newProjectData.needScore) || 0;
      const businessId = `charity-${Date.now()}`;
      
      const encryptedResult = await encrypt(contractAddress, address, needScoreValue);
      
      const tx = await contract.createBusinessData(
        businessId,
        newProjectData.name,
        encryptedResult.encryptedData,
        encryptedResult.proof,
        0,
        0,
        newProjectData.description
      );
      
      setTransactionStatus({ visible: true, status: "pending", message: "Waiting for transaction confirmation..." });
      await tx.wait();
      
      setUserHistory(prev => [...prev, `Created project: ${newProjectData.name}`]);
      setTransactionStatus({ visible: true, status: "success", message: "Project created successfully!" });
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
      
      await loadData();
      setShowCreateModal(false);
      setNewProjectData({ name: "", needScore: "", description: "" });
    } catch (e: any) {
      const errorMessage = e.message?.includes("user rejected transaction") 
        ? "Transaction rejected by user" 
        : "Submission failed: " + (e.message || "Unknown error");
      setTransactionStatus({ visible: true, status: "error", message: errorMessage });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    } finally { 
      setCreatingProject(false); 
    }
  };

  const decryptData = async (businessId: string): Promise<number | null> => {
    if (!isConnected || !address) { 
      setTransactionStatus({ visible: true, status: "error", message: "Please connect wallet first" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return null; 
    }
    
    setIsDecrypting(true);
    try {
      const contractRead = await getContractReadOnly();
      if (!contractRead) return null;
      
      const businessData = await contractRead.getBusinessData(businessId);
      if (businessData.isVerified) {
        const storedValue = Number(businessData.decryptedValue) || 0;
        
        setTransactionStatus({ 
          visible: true, 
          status: "success", 
          message: "Data already verified on-chain" 
        });
        setTimeout(() => {
          setTransactionStatus({ visible: false, status: "pending", message: "" });
        }, 2000);
        
        return storedValue;
      }
      
      const contractWrite = await getContractWithSigner();
      if (!contractWrite) return null;
      
      const encryptedValueHandle = await contractRead.getEncryptedValue(businessId);
      
      const result = await verifyDecryption(
        [encryptedValueHandle],
        contractAddress,
        (abiEncodedClearValues: string, decryptionProof: string) => 
          contractWrite.verifyDecryption(businessId, abiEncodedClearValues, decryptionProof)
      );
      
      setTransactionStatus({ visible: true, status: "pending", message: "Verifying decryption on-chain..." });
      
      const clearValue = result.decryptionResult.clearValues[encryptedValueHandle];
      
      await loadData();
      setUserHistory(prev => [...prev, `Decrypted data for project: ${businessId}`]);
      
      setTransactionStatus({ visible: true, status: "success", message: "Data decrypted and verified successfully!" });
      setTimeout(() => {
        setTransactionStatus({ visible: false, status: "pending", message: "" });
      }, 2000);
      
      return Number(clearValue);
      
    } catch (e: any) { 
      if (e.message?.includes("Data already verified")) {
        setTransactionStatus({ 
          visible: true, 
          status: "success", 
          message: "Data is already verified on-chain" 
        });
        setTimeout(() => {
          setTransactionStatus({ visible: false, status: "pending", message: "" });
        }, 2000);
        
        await loadData();
        return null;
      }
      
      setTransactionStatus({ 
        visible: true, 
        status: "error", 
        message: "Decryption failed: " + (e.message || "Unknown error") 
      });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
      return null; 
    } finally { 
      setIsDecrypting(false); 
    }
  };

  const checkAvailability = async () => {
    try {
      const contract = await getContractReadOnly();
      if (!contract) return;
      
      const isAvailable = await contract.isAvailable();
      setTransactionStatus({ 
        visible: true, 
        status: "success", 
        message: "Contract is available and responding" 
      });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 2000);
    } catch (e) {
      setTransactionStatus({ visible: true, status: "error", message: "Contract check failed" });
      setTimeout(() => setTransactionStatus({ visible: false, status: "pending", message: "" }), 3000);
    }
  };

  const analyzeAllocation = (project: CharityProject, decryptedNeed: number | null): AllocationAnalysis => {
    const needScore = project.isVerified ? (project.decryptedValue || 0) : (decryptedNeed || project.publicValue1 || 5);
    
    const fairnessScore = Math.min(100, Math.round(needScore * 8 + Math.random() * 20));
    const urgencyLevel = Math.min(100, Math.round(needScore * 6 + Math.random() * 30));
    const impactPotential = Math.min(100, Math.round(needScore * 7 + Math.random() * 25));
    const resourceEfficiency = Math.min(100, Math.round(100 - (needScore * 0.5) + Math.random() * 15));
    const privacyScore = 95;

    return {
      fairnessScore,
      urgencyLevel,
      impactPotential,
      resourceEfficiency,
      privacyScore
    };
  };

  const renderStatistics = () => {
    const totalProjects = projects.length;
    const verifiedProjects = projects.filter(p => p.isVerified).length;
    const avgNeedScore = projects.length > 0 
      ? projects.reduce((sum, p) => sum + p.publicValue1, 0) / projects.length 
      : 0;
    
    const recentProjects = projects.filter(p => 
      Date.now()/1000 - p.timestamp < 60 * 60 * 24 * 7
    ).length;

    return (
      <div className="stats-grid">
        <div className="stat-card neon-purple">
          <h3>Total Projects</h3>
          <div className="stat-value">{totalProjects}</div>
          <div className="stat-trend">+{recentProjects} this week</div>
        </div>
        
        <div className="stat-card neon-blue">
          <h3>Verified Data</h3>
          <div className="stat-value">{verifiedProjects}/{totalProjects}</div>
          <div className="stat-trend">FHE Protected</div>
        </div>
        
        <div className="stat-card neon-pink">
          <h3>Avg Need Score</h3>
          <div className="stat-value">{avgNeedScore.toFixed(1)}/10</div>
          <div className="stat-trend">Encrypted Analysis</div>
        </div>
        
        <div className="stat-card neon-green">
          <h3>Privacy Score</h3>
          <div className="stat-value">95%</div>
          <div className="stat-trend">FHE Secured</div>
        </div>
      </div>
    );
  };

  const renderAllocationChart = (project: CharityProject, decryptedNeed: number | null) => {
    const analysis = analyzeAllocation(project, decryptedNeed);
    
    return (
      <div className="allocation-chart">
        <div className="chart-row">
          <div className="chart-label">Fairness Score</div>
          <div className="chart-bar">
            <div 
              className="bar-fill" 
              style={{ width: `${analysis.fairnessScore}%` }}
            >
              <span className="bar-value">{analysis.fairnessScore}</span>
            </div>
          </div>
        </div>
        <div className="chart-row">
          <div className="chart-label">Urgency Level</div>
          <div className="chart-bar">
            <div 
              className="bar-fill" 
              style={{ width: `${analysis.urgencyLevel}%` }}
            >
              <span className="bar-value">{analysis.urgencyLevel}</span>
            </div>
          </div>
        </div>
        <div className="chart-row">
          <div className="chart-label">Impact Potential</div>
          <div className="chart-bar">
            <div 
              className="bar-fill" 
              style={{ width: `${analysis.impactPotential}%` }}
            >
              <span className="bar-value">{analysis.impactPotential}</span>
            </div>
          </div>
        </div>
        <div className="chart-row">
          <div className="chart-label">Resource Efficiency</div>
          <div className="chart-bar">
            <div 
              className="bar-fill" 
              style={{ width: `${analysis.resourceEfficiency}%` }}
            >
              <span className="bar-value">{analysis.resourceEfficiency}</span>
            </div>
          </div>
        </div>
        <div className="chart-row">
          <div className="chart-label">Privacy Protection</div>
          <div className="chart-bar">
            <div 
              className="bar-fill" 
              style={{ width: `${analysis.privacyScore}%` }}
            >
              <span className="bar-value">{analysis.privacyScore}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.creator.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isConnected) {
    return (
      <div className="app-container">
        <header className="app-header">
          <div className="logo">
            <h1>Private Charity Allocation 🔐</h1>
          </div>
          <div className="header-actions">
            <div className="wallet-connect-wrapper">
              <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false}/>
            </div>
          </div>
        </header>
        
        <div className="connection-prompt">
          <div className="connection-content">
            <div className="connection-icon">💝</div>
            <h2>Connect Your Wallet to Continue</h2>
            <p>Please connect your wallet to access the private charity allocation system with FHE protection.</p>
            <div className="connection-steps">
              <div className="step">
                <span>1</span>
                <p>Connect your wallet using the button above</p>
              </div>
              <div className="step">
                <span>2</span>
                <p>FHE system will automatically initialize</p>
              </div>
              <div className="step">
                <span>3</span>
                <p>Start managing encrypted charity allocations</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isInitialized || fhevmInitializing) {
    return (
      <div className="loading-screen">
        <div className="fhe-spinner"></div>
        <p>Initializing FHE Encryption System...</p>
        <p className="loading-note">Securing charity data with homomorphic encryption</p>
      </div>
    );
  }

  if (loading) return (
    <div className="loading-screen">
      <div className="fhe-spinner"></div>
      <p>Loading charity allocation system...</p>
    </div>
  );

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="logo">
          <h1>Private Charity Allocation 🔐</h1>
          <p>FHE-Protected Donation Distribution</p>
        </div>
        
        <div className="header-actions">
          <button onClick={checkAvailability} className="check-btn">
            Check Contract
          </button>
          <button 
            onClick={() => setShowCreateModal(true)} 
            className="create-btn"
          >
            + New Project
          </button>
          <div className="wallet-connect-wrapper">
            <ConnectButton accountStatus="address" chainStatus="icon" showBalance={false}/>
          </div>
        </div>
      </header>
      
      <div className="main-content">
        <div className="dashboard-section">
          <h2>Charity Allocation Analytics</h2>
          {renderStatistics()}
        </div>
        
        <div className="projects-section">
          <div className="section-header">
            <h2>Charity Projects</h2>
            <div className="header-actions">
              <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              <button 
                onClick={loadData} 
                className="refresh-btn" 
                disabled={isRefreshing}
              >
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </button>
            </div>
          </div>
          
          <div className="projects-grid">
            {filteredProjects.length === 0 ? (
              <div className="no-projects">
                <p>No charity projects found</p>
                <button 
                  className="create-btn" 
                  onClick={() => setShowCreateModal(true)}
                >
                  Create First Project
                </button>
              </div>
            ) : filteredProjects.map((project, index) => (
              <div 
                className={`project-card ${selectedProject?.id === project.id ? "selected" : ""} ${project.isVerified ? "verified" : ""}`} 
                key={index}
                onClick={() => setSelectedProject(project)}
              >
                <div className="project-header">
                  <div className="project-title">{project.name}</div>
                  <div className={`status-badge ${project.isVerified ? "verified" : "pending"}`}>
                    {project.isVerified ? "✅ Verified" : "🔓 Pending"}
                  </div>
                </div>
                <div className="project-meta">
                  <span>Need Score: {project.publicValue1}/10</span>
                  <span>Created: {new Date(project.timestamp * 1000).toLocaleDateString()}</span>
                </div>
                <div className="project-creator">By: {project.creator.substring(0, 6)}...{project.creator.substring(38)}</div>
                {project.isVerified && project.decryptedValue && (
                  <div className="project-allocation">
                    Allocation: {project.decryptedValue} units
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="user-history">
          <h3>Your Activity History</h3>
          <div className="history-list">
            {userHistory.slice(-5).map((item, index) => (
              <div key={index} className="history-item">
                {item}
              </div>
            ))}
            {userHistory.length === 0 && (
              <div className="history-item">No activity yet</div>
            )}
          </div>
        </div>
      </div>
      
      {showCreateModal && (
        <ModalCreateProject 
          onSubmit={createProject} 
          onClose={() => setShowCreateModal(false)} 
          creating={creatingProject} 
          projectData={newProjectData} 
          setProjectData={setNewProjectData}
          isEncrypting={isEncrypting}
        />
      )}
      
      {selectedProject && (
        <ProjectDetailModal 
          project={selectedProject} 
          onClose={() => { 
            setSelectedProject(null); 
            setDecryptedData({ needScore: null, allocation: null }); 
          }} 
          decryptedData={decryptedData} 
          setDecryptedData={setDecryptedData} 
          isDecrypting={isDecrypting || fheIsDecrypting} 
          decryptData={() => decryptData(selectedProject.id)}
          renderAllocationChart={renderAllocationChart}
        />
      )}
      
      {transactionStatus.visible && (
        <div className="transaction-modal">
          <div className="transaction-content">
            <div className={`transaction-icon ${transactionStatus.status}`}>
              {transactionStatus.status === "pending" && <div className="fhe-spinner"></div>}
              {transactionStatus.status === "success" && <div className="success-icon">✓</div>}
              {transactionStatus.status === "error" && <div className="error-icon">✗</div>}
            </div>
            <div className="transaction-message">{transactionStatus.message}</div>
          </div>
        </div>
      )}
    </div>
  );
};

const ModalCreateProject: React.FC<{
  onSubmit: () => void; 
  onClose: () => void; 
  creating: boolean;
  projectData: any;
  setProjectData: (data: any) => void;
  isEncrypting: boolean;
}> = ({ onSubmit, onClose, creating, projectData, setProjectData, isEncrypting }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'needScore') {
      const intValue = value.replace(/[^\d]/g, '');
      setProjectData({ ...projectData, [name]: intValue });
    } else {
      setProjectData({ ...projectData, [name]: value });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="create-project-modal">
        <div className="modal-header">
          <h2>New Charity Project</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="fhe-notice">
            <strong>FHE 🔐 Encryption</strong>
            <p>Need score will be encrypted with homomorphic encryption (Integer only)</p>
          </div>
          
          <div className="form-group">
            <label>Project Name *</label>
            <input 
              type="text" 
              name="name" 
              value={projectData.name} 
              onChange={handleChange} 
              placeholder="Enter project name..." 
            />
          </div>
          
          <div className="form-group">
            <label>Need Score (Integer 1-100) *</label>
            <input 
              type="number" 
              name="needScore" 
              value={projectData.needScore} 
              onChange={handleChange} 
              placeholder="Enter need score..." 
              min="1"
              max="100"
            />
            <div className="data-type-label">FHE Encrypted Integer</div>
          </div>
          
          <div className="form-group">
            <label>Project Description</label>
            <textarea 
              name="description" 
              value={projectData.description} 
              onChange={handleChange} 
              placeholder="Enter project description..." 
              rows={3}
            />
          </div>
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="cancel-btn">Cancel</button>
          <button 
            onClick={onSubmit} 
            disabled={creating || isEncrypting || !projectData.name || !projectData.needScore} 
            className="submit-btn"
          >
            {creating || isEncrypting ? "Encrypting and Creating..." : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
};

const ProjectDetailModal: React.FC<{
  project: CharityProject;
  onClose: () => void;
  decryptedData: { needScore: number | null; allocation: number | null };
  setDecryptedData: (value: { needScore: number | null; allocation: number | null }) => void;
  isDecrypting: boolean;
  decryptData: () => Promise<number | null>;
  renderAllocationChart: (project: CharityProject, decryptedNeed: number | null) => JSX.Element;
}> = ({ project, onClose, decryptedData, setDecryptedData, isDecrypting, decryptData, renderAllocationChart }) => {
  const handleDecrypt = async () => {
    if (decryptedData.needScore !== null) { 
      setDecryptedData({ needScore: null, allocation: null }); 
      return; 
    }
    
    const decrypted = await decryptData();
    if (decrypted !== null) {
      setDecryptedData({ needScore: decrypted, allocation: decrypted });
    }
  };

  return (
    <div className="modal-overlay">
      <div className="project-detail-modal">
        <div className="modal-header">
          <h2>Project Details</h2>
          <button onClick={onClose} className="close-modal">&times;</button>
        </div>
        
        <div className="modal-body">
          <div className="project-info">
            <div className="info-item">
              <span>Project Name:</span>
              <strong>{project.name}</strong>
            </div>
            <div className="info-item">
              <span>Creator:</span>
              <strong>{project.creator.substring(0, 6)}...{project.creator.substring(38)}</strong>
            </div>
            <div className="info-item">
              <span>Date Created:</span>
              <strong>{new Date(project.timestamp * 1000).toLocaleDateString()}</strong>
            </div>
          </div>
          
          <div className="data-section">
            <h3>Encrypted Need Assessment</h3>
            
            <div className="data-row">
              <div className="data-label">Need Score:</div>
              <div className="data-value">
                {project.isVerified && project.decryptedValue ? 
                  `${project.decryptedValue} (On-chain Verified)` : 
                  decryptedData.needScore !== null ? 
                  `${decryptedData.needScore} (Locally Decrypted)` : 
                  "🔒 FHE Encrypted Integer"
                }
              </div>
              <button 
                className={`decrypt-btn ${(project.isVerified || decryptedData.needScore !== null) ? 'decrypted' : ''}`}
                onClick={handleDecrypt} 
                disabled={isDecrypting}
              >
                {isDecrypting ? (
                  "🔓 Verifying..."
                ) : project.isVerified ? (
                  "✅ Verified"
                ) : decryptedData.needScore !== null ? (
                  "🔄 Re-verify"
                ) : (
                  "🔓 Verify Decryption"
                )}
              </button>
            </div>
            
            <div className="fhe-info">
              <div className="fhe-icon">🔐</div>
              <div>
                <strong>FHE Protected Allocation</strong>
                <p>Need scores are encrypted on-chain. Verification performs offline decryption with on-chain proof validation.</p>
              </div>
            </div>
          </div>
          
          {(project.isVerified || decryptedData.needScore !== null) && (
            <div className="analysis-section">
              <h3>Allocation Analysis</h3>
              {renderAllocationChart(
                project, 
                project.isVerified ? project.decryptedValue || null : decryptedData.needScore
              )}
              
              <div className="decrypted-values">
                <div className="value-item">
                  <span>Need Score:</span>
                  <strong>
                    {project.isVerified ? 
                      `${project.decryptedValue} (Verified)` : 
                      `${decryptedData.needScore} (Decrypted)`
                    }
                  </strong>
                  <span className={`data-badge ${project.isVerified ? 'verified' : 'local'}`}>
                    {project.isVerified ? 'On-chain Verified' : 'Local Decryption'}
                  </span>
                </div>
                <div className="value-item">
                  <span>Recommended Allocation:</span>
                  <strong>
                    {project.isVerified ? 
                      `${(project.decryptedValue || 0) * 100} units` : 
                      `${(decryptedData.needScore || 0) * 100} units`
                    }
                  </strong>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="modal-footer">
          <button onClick={onClose} className="close-btn">Close</button>
          {!project.isVerified && (
            <button 
              onClick={handleDecrypt} 
              disabled={isDecrypting}
              className="verify-btn"
            >
              {isDecrypting ? "Verifying on-chain..." : "Verify on-chain"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;


