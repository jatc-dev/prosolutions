import React from 'react';
import { useParams } from 'react-router-dom';
import { CompleteCVEditor } from '../components/editor/CompleteCVEditor';

export function CVEditorPage() {
  const { cvId } = useParams<{ cvId: string }>();

  return (
    <div className="ui-page min-h-screen bg-gradient-to-br from-brand-50 to-blue-50">
      <CompleteCVEditor cvId={cvId} />
    </div>
  );
}