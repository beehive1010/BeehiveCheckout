import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

// 错误边界组件 - 捕获背景动画错误
class BackgroundErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('Background animation error (non-critical):', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // 如果背景出错，只显示简单的渐变背景
      return (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-gray-900 to-slate-950" />
      );
    }

    return this.props.children;
  }
}

export default BackgroundErrorBoundary;
