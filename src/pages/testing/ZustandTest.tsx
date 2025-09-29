// Test page for Zustand store implementation
import React from 'react';
import { StoreTestComponent } from '../../components/testing/StoreTestComponent';

export default function ZustandTestPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-6">
        <StoreTestComponent />
      </div>
    </div>
  );
}