import CommunityGuidelines from './CommunityGuidelines.jsx';
import PrivacyPolicy from './PrivacyPolicy.jsx';
import RecordingAgreement from './RecordingAgreement.jsx';
import TermsOfService from './TermsOfService.jsx';

export default function LegalViewer({ documentId, onBack }) {
  if (documentId === 'terms') {
    return <TermsOfService onBack={onBack} />;
  }
  if (documentId === 'privacy') {
    return <PrivacyPolicy onBack={onBack} />;
  }
  if (documentId === 'community') {
    return <CommunityGuidelines onBack={onBack} />;
  }
  if (documentId === 'recording') {
    return <RecordingAgreement onBack={onBack} />;
  }
  return null;
}