import React from 'react';
import MemberGuard from '../components/guards/MemberGuard';
import WelcomePage from '../components/welcome/WelcomePage';

export default function Welcome() {
  return (
    <MemberGuard requireActivation={false} redirectTo="/welcome">
      <WelcomePage />
    </MemberGuard>
  );
}
