import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getStudentParticipationSummary, getYearwiseParticipation, getEvaluationDistributions } from '@/lib/internships';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export default function InternshipReportsTab() {
  const [summary, setSummary] = useState<any[]>([]);
  const [yearwise, setYearwise] = useState<any[]>([]);
  const [dist, setDist] = useState<any[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const [s, y, d] = await Promise.all([
          getStudentParticipationSummary(),
          getYearwiseParticipation(),
          getEvaluationDistributions(),
        ]);
        setSummary(s); setYearwise(y); setDist(d);
      } catch (e: any) {
        toast.error(e.message ?? 'Error loading reports');
      }
    })();
  }, []);

  const exportXLSX = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summary), 'Student Summary');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(yearwise), 'Yearwise');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(dist), 'Distributions');
    XLSX.writeFile(wb, 'internship_reports.xlsx');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text('Internship Reports', 10, 10);
    doc.text(`Student Summary rows: ${summary.length}`, 10, 20);
    doc.text(`Yearwise rows: ${yearwise.length}`, 10, 30);
    doc.text(`Distributions rows: ${dist.length}`, 10, 40);
    doc.save('internship_reports.pdf');
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Button onClick={exportXLSX}>Export XLSX</Button>
        <Button onClick={exportPDF}>Export PDF</Button>
      </div>
      <Card>
        <CardHeader><CardTitle>Student-wise Participation Summary</CardTitle></CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto max-h-64">{JSON.stringify(summary, null, 2)}</pre>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Year-wise Participation</CardTitle></CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto max-h-64">{JSON.stringify(yearwise, null, 2)}</pre>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>Evaluation Distributions by Department</CardTitle></CardHeader>
        <CardContent>
          <pre className="text-xs overflow-auto max-h-64">{JSON.stringify(dist, null, 2)}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
