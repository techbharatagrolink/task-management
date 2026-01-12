'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  FileText, 
  Loader2, 
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Download,
  Save,
  Eye
} from 'lucide-react';
import { authenticatedFetch } from '@/lib/auth-client';
import { useToast } from '@/hooks/use-toast';
import { hasRoleAccess } from '@/lib/roleCheck';

// Convert number to Indian currency words
function numberToWords(num) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  function convertHundreds(n) {
    let result = '';
    let remaining = n;
    if (remaining >= 100) {
      result += ones[Math.floor(remaining / 100)] + ' Hundred ';
      remaining %= 100;
    }
    if (remaining >= 20) {
      result += tens[Math.floor(remaining / 10)] + ' ';
      remaining %= 10;
    } else if (remaining >= 10) {
      result += teens[remaining - 10] + ' ';
      remaining = 0;
    }
    if (remaining > 0) {
      result += ones[remaining] + ' ';
    }
    return result.trim();
  }
  
  if (num === 0) return 'Zero';
  
  const parts = num.toString().split('.');
  let wholePart = parseInt(parts[0]);
  const decimalPart = parts[1] ? parseInt(parts[1]) : 0;
  
  let words = '';
  
  if (wholePart >= 10000000) {
    words += convertHundreds(Math.floor(wholePart / 10000000)) + ' Crore ';
    wholePart %= 10000000;
  }
  if (wholePart >= 100000) {
    words += convertHundreds(Math.floor(wholePart / 100000)) + ' Lakh ';
    wholePart %= 100000;
  }
  if (wholePart >= 1000) {
    words += convertHundreds(Math.floor(wholePart / 1000)) + ' Thousand ';
    wholePart %= 1000;
  }
  if (wholePart > 0) {
    words += convertHundreds(wholePart);
  }
  
  words = words.trim() || 'Zero';
  
  if (decimalPart > 0) {
    words += ' and ' + convertHundreds(decimalPart) + ' Paise';
  }
  
  return words + ' Rupees Only';
}

function PayslipsPageContent() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [employees, setEmployees] = useState([]);
  const [savedPayslips, setSavedPayslips] = useState([]);
  const [user, setUser] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    payslip_month: '',
    employee_name: '',
    employee_id_code: '',
    designation: '',
    department: '',
    date_of_joining: '',
    bank_name: '',
    account_number: '',
    uan_pf_number: '',
    earnings: [{ name: '', amount: '' }],
    deductions: [{ name: '', amount: '' }],
    net_pay_words: ''
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchEmployees();
      fetchPayslips();
      
      // Pre-fill employee_id from URL if provided
      const employeeId = searchParams.get('employee_id');
      if (employeeId) {
        setFormData(prev => ({ ...prev, employee_id: employeeId }));
      }
    }
  }, [user, searchParams]);

  // Calculate totals whenever earnings or deductions change
  useEffect(() => {
    const totalEarnings = formData.earnings.reduce((sum, item) => {
      return sum + (parseFloat(item.amount) || 0);
    }, 0);
    
    const totalDeductions = formData.deductions.reduce((sum, item) => {
      return sum + (parseFloat(item.amount) || 0);
    }, 0);
    
    const netPay = totalEarnings - totalDeductions;
    
    if (netPay > 0) {
      setFormData(prev => ({
        ...prev,
        net_pay_words: numberToWords(Math.round(netPay))
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        net_pay_words: ''
      }));
    }
  }, [formData.earnings, formData.deductions]);

  // Auto-fill employee data when employee is selected
  useEffect(() => {
    if (formData.employee_id) {
      const employee = employees.find(emp => emp.id === parseInt(formData.employee_id));
      if (employee) {
        setFormData(prev => ({
          ...prev,
          employee_name: employee.name || '',
          designation: employee.designation || '',
          department: employee.department || '',
          date_of_joining: employee.joining_date || ''
        }));
      }
    }
  }, [formData.employee_id, employees]);

  const fetchUser = async () => {
    try {
      const res = await authenticatedFetch('/api/auth/check');
      const text = await res.text();
      if (text) {
        const data = JSON.parse(text);
        if (data.authenticated) {
          setUser(data.user);
          
          // Check role access
          if (!hasRoleAccess(data.user.role, ['Super Admin', 'Admin', 'Manager', 'HR'])) {
            window.location.href = '/dashboard';
            return;
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const res = await authenticatedFetch('/api/employees');
      const text = await res.text();
      if (!text) {
        setEmployees([]);
        return;
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('Failed to parse JSON response:', parseErr);
        setEmployees([]);
        return;
      }
      
      if (res.ok && data.employees) {
        setEmployees(data.employees.filter(emp => emp.role !== 'Super Admin'));
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error('Failed to fetch employees:', err);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchPayslips = async () => {
    try {
      const res = await authenticatedFetch('/api/payslips');
      const text = await res.text();
      if (text) {
        const data = JSON.parse(text);
        if (res.ok && data.payslips) {
          setSavedPayslips(data.payslips);
        }
      }
    } catch (err) {
      console.error('Failed to fetch payslips:', err);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleEarningChange = (index, field, value) => {
    const newEarnings = [...formData.earnings];
    newEarnings[index] = { ...newEarnings[index], [field]: value };
    setFormData(prev => ({ ...prev, earnings: newEarnings }));
  };

  const handleDeductionChange = (index, field, value) => {
    const newDeductions = [...formData.deductions];
    newDeductions[index] = { ...newDeductions[index], [field]: value };
    setFormData(prev => ({ ...prev, deductions: newDeductions }));
  };

  const addEarningRow = () => {
    setFormData(prev => ({
      ...prev,
      earnings: [...prev.earnings, { name: '', amount: '' }]
    }));
  };

  const removeEarningRow = (index) => {
    if (formData.earnings.length > 1) {
      setFormData(prev => ({
        ...prev,
        earnings: prev.earnings.filter((_, i) => i !== index)
      }));
    }
  };

  const addDeductionRow = () => {
    setFormData(prev => ({
      ...prev,
      deductions: [...prev.deductions, { name: '', amount: '' }]
    }));
  };

  const removeDeductionRow = (index) => {
    // Allow removing all deduction rows (deductions are optional)
    setFormData(prev => ({
      ...prev,
      deductions: prev.deductions.filter((_, i) => i !== index)
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.employee_id) {
      newErrors.employee_id = 'Please select an employee';
    }
    if (!formData.payslip_month) {
      newErrors.payslip_month = 'Please enter payslip month';
    }
    if (!formData.employee_name) {
      newErrors.employee_name = 'Employee name is required';
    }

    // Validate earnings
    formData.earnings.forEach((earning, index) => {
      if (!earning.name || !earning.name.trim()) {
        newErrors[`earning_name_${index}`] = 'Earning name is required';
      }
      if (!earning.amount || parseFloat(earning.amount) <= 0) {
        newErrors[`earning_amount_${index}`] = 'Valid earning amount is required';
      }
    });

    // Validate deductions (optional - only validate if deductions exist)
    formData.deductions.forEach((deduction, index) => {
      // Only validate if deduction has a name (meaning user started filling it)
      if (deduction.name && deduction.name.trim()) {
        if (!deduction.amount || parseFloat(deduction.amount) <= 0) {
          newErrors[`deduction_amount_${index}`] = 'Valid deduction amount is required';
        }
      } else if (deduction.amount && parseFloat(deduction.amount) > 0) {
        // If amount is provided, name is required
        if (!deduction.name || !deduction.name.trim()) {
          newErrors[`deduction_name_${index}`] = 'Deduction name is required';
        }
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please fill in all required fields correctly.',
      });
      return;
    }

    setSubmitting(true);
    setSuccess(false);

    try {
      const payload = {
        employee_id: parseInt(formData.employee_id),
        payslip_month: formData.payslip_month,
        employee_name: formData.employee_name,
        employee_id_code: formData.employee_id_code || null,
        designation: formData.designation || null,
        department: formData.department || null,
        date_of_joining: formData.date_of_joining || null,
        bank_name: formData.bank_name || null,
        account_number: formData.account_number || null,
        uan_pf_number: formData.uan_pf_number || null,
        earnings: formData.earnings.map(e => ({
          name: e.name.trim(),
          amount: parseFloat(e.amount) || 0
        })),
        deductions: formData.deductions
          .filter(d => d.name && d.name.trim()) // Only include deductions with names
          .map(d => ({
            name: d.name.trim(),
            amount: parseFloat(d.amount) || 0
          })),
        net_pay_words: formData.net_pay_words || null
      };

      const res = await authenticatedFetch('/api/payslips', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      if (!text) {
        throw new Error('Empty response from server');
      }
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseErr) {
        console.error('Failed to parse JSON response:', parseErr);
        throw new Error('Invalid response from server');
      }

      if (res.ok && data.success) {
        setSuccess(true);
        toast({
          title: 'Payslip Saved',
          description: 'Payslip has been successfully saved.',
        });
        
        // Reset form
        setFormData({
          employee_id: '',
          payslip_month: '',
          employee_name: '',
          employee_id_code: '',
          designation: '',
          department: '',
          date_of_joining: '',
          bank_name: '',
          account_number: '',
          uan_pf_number: '',
          earnings: [{ name: '', amount: '' }],
          deductions: [{ name: '', amount: '' }],
          net_pay_words: ''
        });
        setErrors({});
        
        // Refresh payslips list
        fetchPayslips();
      } else {
        throw new Error(data.error || 'Failed to save payslip');
      }
    } catch (err) {
      console.error('Failed to save payslip:', err);
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: err.message || 'Failed to save payslip. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const calculateTotals = (data = null) => {
    const earnings = data?.earnings || formData.earnings;
    const deductions = data?.deductions || formData.deductions;
    
    const totalEarnings = earnings.reduce((sum, item) => {
      // Handle both string and number amounts
      const amount = typeof item.amount === 'string' ? parseFloat(item.amount) : (item.amount || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const totalDeductions = deductions.reduce((sum, item) => {
      // Handle both string and number amounts
      const amount = typeof item.amount === 'string' ? parseFloat(item.amount) : (item.amount || 0);
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    return {
      totalEarnings,
      totalDeductions,
      netPay: totalEarnings - totalDeductions
    };
  };

  const generatePDF = async (payslipData = null) => {
    setGeneratingPdf(true);
    try {
      const data = payslipData || formData;
      
      // Validate if generating from form
      if (!payslipData && !validateForm()) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: 'Please fill in all required fields before generating PDF.',
        });
        setGeneratingPdf(false);
        return;
      }

      // Calculate totals using the correct data source
      const totals = calculateTotals(data);
      
      // Create HTML content for PDF
      const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Payslip - BharatAgrolink</title>
          <style>
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              background-color: #fff;
              color: #333;
              font-size: 14px;
              padding: 40px;
            }
            .payslip-container {
              width: 210mm;
              min-height: 297mm;
              background-color: #fff;
              margin: 0 auto;
              padding: 40px;
            }
            header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 2px solid #2c3e50;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .company-logo img {
              max-width: 120px;
              height: auto;
            }
            .company-details {
              text-align: right;
            }
            .company-details h1 {
              font-size: 24px;
              color: #2c3e50;
              margin-bottom: 5px;
              text-transform: uppercase;
            }
            .company-details p {
              font-size: 12px;
              color: #555;
              line-height: 1.4;
            }
            .payslip-title {
              text-align: center;
              margin-bottom: 25px;
            }
            .payslip-title h2 {
              font-size: 18px;
              background-color: #eef2f5;
              padding: 8px;
              border-radius: 4px;
              display: inline-block;
              border: 1px solid #ddd;
            }
            .employee-info {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
              margin-bottom: 30px;
            }
            .info-group {
              margin-bottom: 8px;
            }
            .info-group span.label {
              font-weight: bold;
              color: #555;
              width: 120px;
              display: inline-block;
            }
            .salary-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            .salary-table th, .salary-table td {
              border: 1px solid #ddd;
              padding: 10px;
              text-align: left;
            }
            .salary-table th {
              background-color: #2c3e50;
              color: #fff;
              text-transform: uppercase;
              font-size: 12px;
              width: 50%;
            }
            .salary-table td.amount {
              text-align: right;
            }
            .salary-table tr.total-row {
              background-color: #eef2f5;
              font-weight: bold;
            }
            .net-pay-section {
              border: 2px dashed #2c3e50;
              padding: 15px;
              background-color: #f9f9f9;
              margin-bottom: 40px;
              display: flex;
              justify-content: space-between;
              align-items: center;
            }
            .net-pay-text {
              font-size: 16px;
            }
            .net-pay-amount {
              font-size: 20px;
              font-weight: bold;
              color: #2c3e50;
            }
            .signatures {
              display: flex;
              justify-content: space-between;
              margin-top: 80px;
            }
            .sig-block {
              text-align: center;
              width: 200px;
            }
            .sig-line {
              border-top: 1px solid #333;
              margin-bottom: 5px;
            }
            .footer-note {
              text-align: center;
              font-size: 10px;
              color: #777;
              margin-top: 50px;
              border-top: 1px solid #eee;
              padding-top: 10px;
            }
          </style>
        </head>
        <body>
          <div class="payslip-container">
            <header>
              <div class="company-logo">
                <img src="https://ik.imagekit.io/h7mvzndkk/seller.bharatagrolink.com/whatsappbg.png?updatedAt=1763807245201" alt="BharatAgrolink Logo">
              </div>
              <div class="company-details">
                <h1>Bharat Agrolink</h1>
                <p>Green Park Apartment, 87, Lala Lajpat Rai Society,<br>
                E-7, Arera Colony, Bhopal, Madhya Pradesh 462016<br>
                hr.bharatagrolink@gmail.com</p>
              </div>
            </header>
            <div class="payslip-title">
              <h2>Payslip for the month of ${data.payslip_month || ''}</h2>
            </div>
            <section class="employee-info">
              <div>
                <div class="info-group"><span class="label">Employee Name:</span> ${data.employee_name || ''}</div>
                <div class="info-group"><span class="label">Employee ID:</span> ${data.employee_id_code || 'N/A'}</div>
                <div class="info-group"><span class="label">Designation:</span> ${data.designation || 'N/A'}</div>
                <div class="info-group"><span class="label">Department:</span> ${data.department || 'N/A'}</div>
              </div>
              <div>
                <div class="info-group"><span class="label">Date of Joining:</span> ${data.date_of_joining ? new Date(data.date_of_joining).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</div>
                <div class="info-group"><span class="label">Bank Name:</span> ${data.bank_name || 'N/A'}</div>
                <div class="info-group"><span class="label">Account No:</span> ${data.account_number || 'N/A'}</div>
                <div class="info-group"><span class="label">UAN / PF No:</span> ${data.uan_pf_number || 'N/A'}</div>
              </div>
            </section>
            <table class="salary-table">
              <thead>
                <tr>
                  <th colspan="2">Earnings</th>
                  <th colspan="2">Deductions</th>
                </tr>
              </thead>
              <tbody>
                ${(() => {
                  const maxRows = Math.max(data.earnings.length, data.deductions.length);
                  let rows = '';
                  for (let i = 0; i < maxRows; i++) {
                    const earning = data.earnings[i] || { name: '', amount: 0 };
                    const deduction = data.deductions[i] || { name: '', amount: 0 };
                    rows += `
                      <tr>
                        <td>${earning.name || ''}</td>
                        <td class="amount">₹ ${(parseFloat(earning.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>${deduction.name || ''}</td>
                        <td class="amount">₹ ${(parseFloat(deduction.amount) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    `;
                  }
                  // Add empty row if needed for spacing
                  if (maxRows < 4) {
                    rows += '<tr><td style="height: 40px;"></td><td></td><td></td><td></td></tr>';
                  }
                  // Add totals row
                  rows += `
                    <tr class="total-row">
                      <td>Total Earnings</td>
                      <td class="amount">₹ ${totals.totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>Total Deductions</td>
                      <td class="amount">₹ ${totals.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    </tr>
                  `;
                  return rows;
                })()}
              </tbody>
            </table>
            <section class="net-pay-section">
              <div class="net-pay-text">
                <strong>Net Payable:</strong> ${data.net_pay_words || numberToWords(Math.round(totals.netPay))}
              </div>
              <div class="net-pay-amount">
                ₹ ${totals.netPay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </section>
            <footer class="signatures">
              <div class="sig-block">
                <div class="sig-line"></div>
                <p>Employee Signature</p>
              </div>
              <div class="sig-block">
                <img src="https://ik.imagekit.io/h7mvzndkk/seller.bharatagrolink.com/sign_png" alt="HR Signature" style="max-width: 150px; height: auto; margin-bottom: 5px;" />
                <p>HR / Authorized Signatory</p>
                <p style="font-size: 10px; color: #555;">BharatAgrolink</p>
              </div>
            </footer>
            <div class="footer-note">
              <p>This is a system-generated payslip. Any discrepancies should be reported to HR within 3 days.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // Open in new window for printing
      const printWindow = window.open('', '_blank');
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load, then trigger print
      setTimeout(() => {
        printWindow.print();
      }, 500);

      toast({
        title: 'PDF Generated',
        description: 'Payslip PDF is ready for download/printing.',
      });
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      toast({
        variant: 'destructive',
        title: 'PDF Generation Failed',
        description: err.message || 'Failed to generate PDF. Please try again.',
      });
    } finally {
      setGeneratingPdf(false);
    }
  };

  const loadPayslip = (payslip) => {
    // Convert amounts to strings for form inputs
    const earnings = payslip.earnings.length > 0 
      ? payslip.earnings.map(e => ({
          name: e.name || '',
          amount: e.amount !== undefined && e.amount !== null ? String(e.amount) : ''
        }))
      : [{ name: '', amount: '' }];
    
    const deductions = payslip.deductions.length > 0
      ? payslip.deductions.map(d => ({
          name: d.name || '',
          amount: d.amount !== undefined && d.amount !== null ? String(d.amount) : ''
        }))
      : [{ name: '', amount: '' }];
    
    setFormData({
      employee_id: payslip.employee_id.toString(),
      payslip_month: payslip.payslip_month,
      employee_name: payslip.employee_name,
      employee_id_code: payslip.employee_id_code || '',
      designation: payslip.designation || '',
      department: payslip.department || '',
      date_of_joining: payslip.date_of_joining || '',
      bank_name: payslip.bank_name || '',
      account_number: payslip.account_number || '',
      uan_pf_number: payslip.uan_pf_number || '',
      earnings: earnings,
      deductions: deductions,
      net_pay_words: payslip.net_pay_words || ''
    });
    setSelectedPayslip(payslip);
    setSuccess(false);
    setErrors({});
    
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" />
            Payslip Generator
          </h1>
          <p className="text-muted-foreground mt-1">
            Generate and manage employee payslips
          </p>
        </div>
      </div>

      {success && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            Payslip saved successfully!
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Create Payslip</CardTitle>
              <CardDescription>
                Fill in the details to generate a payslip
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Employee Selection */}
                <div className="space-y-2">
                  <Label htmlFor="employee_id">
                    Employee <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={formData.employee_id}
                    onValueChange={(value) => handleChange('employee_id', value)}
                  >
                    <SelectTrigger id="employee_id" className={errors.employee_id ? 'border-red-500' : ''}>
                      <SelectValue placeholder="Select an employee" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.length === 0 ? (
                        <SelectItem value="" disabled>No employees available</SelectItem>
                      ) : (
                        employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.name} - {emp.role} {emp.department ? `(${emp.department})` : ''}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {errors.employee_id && (
                    <p className="text-sm text-red-500">{errors.employee_id}</p>
                  )}
                </div>

                {/* Payslip Month */}
                <div className="space-y-2">
                  <Label htmlFor="payslip_month">
                    Payslip Month <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="payslip_month"
                    type="text"
                    value={formData.payslip_month}
                    onChange={(e) => handleChange('payslip_month', e.target.value)}
                    placeholder="e.g., December 2025"
                    className={errors.payslip_month ? 'border-red-500' : ''}
                  />
                  {errors.payslip_month && (
                    <p className="text-sm text-red-500">{errors.payslip_month}</p>
                  )}
                </div>

                {/* Employee Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="employee_name">
                      Employee Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="employee_name"
                      value={formData.employee_name}
                      onChange={(e) => handleChange('employee_name', e.target.value)}
                      className={errors.employee_name ? 'border-red-500' : ''}
                    />
                    {errors.employee_name && (
                      <p className="text-sm text-red-500">{errors.employee_name}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="employee_id_code">Employee ID Code</Label>
                    <Input
                      id="employee_id_code"
                      value={formData.employee_id_code}
                      onChange={(e) => handleChange('employee_id_code', e.target.value)}
                      placeholder="e.g., BAL-0145"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="designation">Designation</Label>
                    <Input
                      id="designation"
                      value={formData.designation}
                      onChange={(e) => handleChange('designation', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Input
                      id="department"
                      value={formData.department}
                      onChange={(e) => handleChange('department', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="date_of_joining">Date of Joining</Label>
                    <Input
                      id="date_of_joining"
                      type="date"
                      value={formData.date_of_joining}
                      onChange={(e) => handleChange('date_of_joining', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bank_name">Bank Name</Label>
                    <Input
                      id="bank_name"
                      value={formData.bank_name}
                      onChange={(e) => handleChange('bank_name', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="account_number">Account Number</Label>
                    <Input
                      id="account_number"
                      value={formData.account_number}
                      onChange={(e) => handleChange('account_number', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="uan_pf_number">UAN / PF Number</Label>
                    <Input
                      id="uan_pf_number"
                      value={formData.uan_pf_number}
                      onChange={(e) => handleChange('uan_pf_number', e.target.value)}
                    />
                  </div>
                </div>

                {/* Earnings Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Earnings</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addEarningRow}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Row
                    </Button>
                  </div>
                  
                  {formData.earnings.map((earning, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                      <div className="md:col-span-5 space-y-2">
                        <Input
                          placeholder="Earning name (e.g., Basic Salary)"
                          value={earning.name}
                          onChange={(e) => handleEarningChange(index, 'name', e.target.value)}
                          className={errors[`earning_name_${index}`] ? 'border-red-500' : ''}
                        />
                        {errors[`earning_name_${index}`] && (
                          <p className="text-xs text-red-500">{errors[`earning_name_${index}`]}</p>
                        )}
                      </div>
                      <div className="md:col-span-6 space-y-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Amount"
                          value={earning.amount}
                          onChange={(e) => handleEarningChange(index, 'amount', e.target.value)}
                          className={errors[`earning_amount_${index}`] ? 'border-red-500' : ''}
                        />
                        {errors[`earning_amount_${index}`] && (
                          <p className="text-xs text-red-500">{errors[`earning_amount_${index}`]}</p>
                        )}
                      </div>
                      <div className="md:col-span-1">
                        {formData.earnings.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeEarningRow(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Deductions Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg">Deductions</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addDeductionRow}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Row
                    </Button>
                  </div>
                  
                  {formData.deductions.map((deduction, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
                      <div className="md:col-span-5 space-y-2">
                        <Input
                          placeholder="Deduction name (e.g., Provident Fund)"
                          value={deduction.name}
                          onChange={(e) => handleDeductionChange(index, 'name', e.target.value)}
                          className={errors[`deduction_name_${index}`] ? 'border-red-500' : ''}
                        />
                        {errors[`deduction_name_${index}`] && (
                          <p className="text-xs text-red-500">{errors[`deduction_name_${index}`]}</p>
                        )}
                      </div>
                      <div className="md:col-span-6 space-y-2">
                        <Input
                          type="number"
                          step="0.01"
                          placeholder="Amount"
                          value={deduction.amount}
                          onChange={(e) => handleDeductionChange(index, 'amount', e.target.value)}
                          className={errors[`deduction_amount_${index}`] ? 'border-red-500' : ''}
                        />
                        {errors[`deduction_amount_${index}`] && (
                          <p className="text-xs text-red-500">{errors[`deduction_amount_${index}`]}</p>
                        )}
                      </div>
                      <div className="md:col-span-1">
                        {formData.deductions.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDeductionRow(index)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Totals Display */}
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total Earnings:</span>
                    <span className="font-semibold">₹ {totals.totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-semibold">Total Deductions:</span>
                    <span className="font-semibold">₹ {totals.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="font-bold text-lg">Net Pay:</span>
                    <span className="font-bold text-lg">₹ {totals.netPay.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  {formData.net_pay_words && (
                    <div className="text-sm text-muted-foreground mt-2">
                      <strong>In words:</strong> {formData.net_pay_words}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-4 pt-4">
                  <Button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-1 border-2 border-primary bg-primary  hover:bg-black/2"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save Payslip
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button"
                    variant="outline"
                    onClick={() => generatePDF()}
                    disabled={generatingPdf}
                    className="flex-1 border-2 border-primary bg-primary  hover:bg-black/2"
                  >
                    {generatingPdf ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Generate PDF
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Saved Payslips Section */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Saved Payslips</CardTitle>
              <CardDescription>
                View and regenerate saved payslips
              </CardDescription>
            </CardHeader>
            <CardContent>
              {savedPayslips.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No payslips saved yet
                </p>
              ) : (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {savedPayslips.map((payslip) => (
                    <div
                      key={payslip.id}
                      className="p-3 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                      onClick={() => loadPayslip(payslip)}
                    >
                      <div className="font-semibold text-sm">{payslip.employee_name}</div>
                      <div className="text-xs text-muted-foreground">{payslip.payslip_month}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Net Pay: ₹ {parseFloat(payslip.net_pay).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            generatePDF(payslip);
                          }}
                        >
                          <Download className="h-3 w-3 mr-1" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function PayslipsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <PayslipsPageContent />
    </Suspense>
  );
}

