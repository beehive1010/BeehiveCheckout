import React, {useEffect, useState} from 'react';
import {supabase} from '../utils/supabase';

const MatrixView = ({ matrixRootWallet }) => {
  const [matrixData, setMatrixData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMatrixData();
  }, [matrixRootWallet]);

  const fetchMatrixData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('matrix_referrals_tree_view')
        .select('*')
        .eq('matrix_root_wallet', matrixRootWallet)
        .order('matrix_position');

      if (error) throw error;
      setMatrixData(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 按layer和position组织数据
  const organizeMatrixData = () => {
    const organized = {};
    
    matrixData.forEach(member => {
      if (!organized[member.layer]) {
        organized[member.layer] = {};
      }
      organized[member.layer][member.position] = member;
    });
    
    return organized;
  };

  // 渲染单个成员卡片
  const renderMemberCard = (member, isRoot = false) => {
    if (!member) {
      return (
        <div className="matrix-slot empty-slot">
          <div className="empty-indicator">空位</div>
        </div>
      );
    }

    return (
      <div className={`matrix-slot ${isRoot ? 'root-slot' : ''} ${member.referral_type}`}>
        <div className="member-info">
          <div className="wallet-address">
            {member.member_wallet.substring(0, 8)}...
          </div>
          <div className="member-details">
            <div className="username">{member.username || 'Anonymous'}</div>
            <div className="activation-seq">#{member.activation_sequence}</div>
            <div className="matrix-pos">位置: {member.matrix_position}</div>
          </div>
          <div className="member-stats">
            <span className={`referral-badge ${member.referral_type}`}>
              {member.referral_type === 'direct' ? '直推' : '滑落'}
            </span>
            <span className="layer-badge">L{member.layer}</span>
          </div>
        </div>
      </div>
    );
  };

  // 渲染Layer1 (3个位置：L, M, R)
  const renderLayer1 = (layerData) => {
    return (
      <div className="matrix-layer layer-1">
        <h3 className="layer-title">Layer 1</h3>
        <div className="layer-grid layer-1-grid">
          {renderMemberCard(layerData?.L)}
          {renderMemberCard(layerData?.M)}
          {renderMemberCard(layerData?.R)}
        </div>
      </div>
    );
  };

  // 渲染Layer2 (9个位置：3组 L,M,R)
  const renderLayer2 = (layerData) => {
    if (!layerData || Object.keys(layerData).length === 0) return null;

    // Layer2有9个位置，需要按parent分组
    const layer2Members = matrixData.filter(m => m.layer === 2);
    const groups = [];
    
    // 按matrix_position分成3组，每组3个
    for (let i = 0; i < layer2Members.length; i += 3) {
      groups.push(layer2Members.slice(i, i + 3));
    }

    return (
      <div className="matrix-layer layer-2">
        <h3 className="layer-title">Layer 2</h3>
        <div className="layer-2-container">
          {groups.map((group, groupIndex) => (
            <div key={groupIndex} className="layer-2-group">
              <div className="group-title">组 {groupIndex + 1}</div>
              <div className="layer-grid layer-2-grid">
                {[0, 1, 2].map(i => renderMemberCard(group[i]))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // 渲染Layer3+ (更多层级)
  const renderHigherLayers = (organizedData) => {
    const higherLayers = Object.keys(organizedData)
      .filter(layer => parseInt(layer) >= 3)
      .sort((a, b) => parseInt(a) - parseInt(b));

    if (higherLayers.length === 0) return null;

    return (
      <div className="higher-layers">
        {higherLayers.map(layer => {
          const layerMembers = matrixData.filter(m => m.layer === parseInt(layer));
          return (
            <div key={layer} className="matrix-layer">
              <h3 className="layer-title">Layer {layer}</h3>
              <div className="higher-layer-grid">
                {layerMembers.map(member => (
                  <div key={member.member_wallet} className="higher-layer-member">
                    {renderMemberCard(member)}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  if (loading) return <div className="matrix-loading">加载Matrix数据...</div>;
  if (error) return <div className="matrix-error">错误: {error}</div>;

  const organizedData = organizeMatrixData();
  const rootMember = matrixData.find(m => m.layer === 0);

  return (
    <div className="matrix-view">
      <div className="matrix-header">
        <h2>Matrix 组织结构</h2>
        <div className="matrix-root-info">
          <span>Matrix Root: {matrixRootWallet.substring(0, 10)}...</span>
          <span>总成员数: {matrixData.length}</span>
        </div>
      </div>

      {/* Root层 */}
      <div className="matrix-layer layer-0">
        <h3 className="layer-title">Matrix Root</h3>
        <div className="root-container">
          {renderMemberCard(rootMember, true)}
        </div>
      </div>

      {/* Layer1 */}
      {organizedData[1] && renderLayer1(organizedData[1])}

      {/* Layer2 */}
      {organizedData[2] && renderLayer2(organizedData[2])}

      {/* Layer3+ */}
      {renderHigherLayers(organizedData)}

      {/* Matrix统计信息 */}
      <div className="matrix-stats">
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-label">Layer 1</span>
            <span className="stat-value">
              {Object.keys(organizedData[1] || {}).length}/3
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Layer 2</span>
            <span className="stat-value">
              {Object.keys(organizedData[2] || {}).length}/9
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">总层级</span>
            <span className="stat-value">
              {Math.max(...matrixData.map(m => m.layer))}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatrixView;