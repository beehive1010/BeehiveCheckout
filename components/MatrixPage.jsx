import React, {useState} from 'react';
import MatrixView from './MatrixView';
import './MatrixView.css';

const MatrixPage = () => {
  const [selectedWallet, setSelectedWallet] = useState('0x0000000000000000000000000000000000000001');
  const [customWallet, setCustomWallet] = useState('');

  // 一些预设的钱包地址用于快速测试
  const presetWallets = [
    {
      address: '0x0000000000000000000000000000000000000001',
      name: '超级根节点'
    },
    {
      address: '0xC813218A28E130B46f8247F0a23F0BD841A8DB4E',
      name: 'Layer1成员 - L位置'
    },
    {
      address: '0xfD6f46A7DF6398814a54db994D04195C3bC6beFD',
      name: 'Layer1成员 - M位置'
    },
    {
      address: '0xB63bA623272D64Cd16c452955a06e0C8A855B99a',
      name: 'Layer1成员 - R位置'
    }
  ];

  const handleWalletChange = (wallet) => {
    setSelectedWallet(wallet);
    setCustomWallet('');
  };

  const handleCustomWalletSubmit = (e) => {
    e.preventDefault();
    if (customWallet.trim()) {
      setSelectedWallet(customWallet.trim());
    }
  };

  return (
    <div className="matrix-page">
      {/* 钱包选择器 */}
      <div className="wallet-selector">
        <div className="selector-header">
          <h3>选择Matrix Root查看</h3>
        </div>
        
        {/* 预设钱包 */}
        <div className="preset-wallets">
          <h4>预设钱包</h4>
          <div className="wallet-buttons">
            {presetWallets.map((wallet) => (
              <button
                key={wallet.address}
                className={`wallet-btn ${selectedWallet === wallet.address ? 'active' : ''}`}
                onClick={() => handleWalletChange(wallet.address)}
              >
                <div className="wallet-name">{wallet.name}</div>
                <div className="wallet-address">{wallet.address.substring(0, 10)}...</div>
              </button>
            ))}
          </div>
        </div>

        {/* 自定义钱包输入 */}
        <div className="custom-wallet">
          <h4>自定义钱包地址</h4>
          <form onSubmit={handleCustomWalletSubmit} className="custom-form">
            <input
              type="text"
              value={customWallet}
              onChange={(e) => setCustomWallet(e.target.value)}
              placeholder="输入钱包地址..."
              className="wallet-input"
            />
            <button type="submit" className="submit-btn">查看Matrix</button>
          </form>
        </div>

        {/* 当前选中的钱包 */}
        <div className="current-selection">
          <strong>当前查看: </strong>
          <span className="current-wallet">{selectedWallet}</span>
        </div>
      </div>

      {/* Matrix视图 */}
      <MatrixView matrixRootWallet={selectedWallet} />
    </div>
  );
};

export default MatrixPage;