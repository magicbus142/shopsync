import React from 'react';
import { Phone } from 'lucide-react';
import phonePeLogo from '../../assets/phonepe.png'
import googlePayLogo from '../../assets/google-pay.png'

export const InvoiceTemplate = React.forwardRef(({ data, templateType = 'modern' }, ref) => {
  const { 
    customer, items, invoiceDate, invoiceNumber, subtotal, 
    total, payments = [], totalPaid = 0, balanceDue = 0, 
    showSignature, signatureImage, companyDetails, 
    showTerms, paymentDetails, showLogo, logoImage,
    watermarkText, watermarkSize = 80, 
    documentTitle = 'INVOICE'
  } = data;

  // Theme Config
  const isClassic = templateType === 'classic';
  const isMinimal = templateType === 'minimal';
  
  const BRAND_COLOR = isClassic ? '#111827' : '#4F46E5'; // Black for Classic, Indigo for others
  const FONT_FAMILY = isClassic ? '"Times New Roman", serif' : 'Helvetica, Arial, sans-serif';

  // Dynamic Styles
  const styles = {
    container: {
        width: '210mm',
        minHeight: '297mm',
        padding: '32px',
        margin: '0 auto',
        fontFamily: FONT_FAMILY,
        backgroundColor: '#ffffff',
        color: '#1f2937', 
        boxSizing: 'border-box',
        position: 'relative', 
        overflow: 'hidden' 
    },
    headerRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '28px',
        paddingBottom: '20px',
        borderBottom: isMinimal ? 'none' : `2px solid ${BRAND_COLOR}`
    },
    headerLeft: {
        display: 'flex',
        flexDirection: 'column',
        textAlign: 'left',
        maxWidth: '60%'
    },
    headerRight: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        textAlign: 'right',
        maxWidth: '40%'
    },
    title: {
        fontSize: isClassic ? '42px' : '36px',
        fontWeight: '900',
        textTransform: 'uppercase',
        letterSpacing: isMinimal ? '0.1em' : '0.05em',
        color: BRAND_COLOR,
        margin: '0 0 8px 0',
        lineHeight: '1'
    },
    companyName: {
        fontSize: isClassic ? '28px' : '24px', 
        fontWeight: 'bold',
        color: '#111827', 
        margin: '0 0 8px 0',
        textTransform: 'uppercase',
        lineHeight: '1.2',
        whiteSpace: 'normal',
        wordBreak: 'break-word'
    },
    companyAddress: {
        fontSize: '13px',
        color: '#4b5563',
        margin: '0 0 8px 0',
        whiteSpace: 'pre-line',
        lineHeight: '1.4'
    },
    phoneRow: {
        display: 'flex', 
        alignItems: 'center', 
        fontSize: '13px', 
        color: '#4b5563',
        marginTop: '2px'
    },
    billedToSection: {
        marginTop: '24px',
        marginBottom: '32px',
        display: 'flex',
        justifyContent: 'space-between',
        borderBottom: isMinimal ? `1px solid #e5e7eb` : 'none', // Minimal separator
        paddingBottom: isMinimal ? '24px' : '0'
    },
    sectionLabel: {
        fontSize: '11px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: '#6b7280',
        marginBottom: '6px',
        letterSpacing: '0.05em'
    },
    customerName: {
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#111827',
        marginBottom: '4px',
        fontFamily: isClassic ? '"Times New Roman", serif' : 'inherit'
    },
    invoiceMetaRow: {
        display: 'flex',
        justifyContent: 'flex-end',
        fontSize: '13px',
        marginBottom: '4px'
    },
    // Table Styles
    table: {
        width: '100%',
        marginBottom: '24px',
        borderCollapse: 'collapse',
        tableLayout: 'auto',
        border: isClassic ? '1px solid #000' : 'none'
    },
    th: {
        padding: '12px',
        textAlign: 'left',
        fontSize: '11px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        backgroundColor: isMinimal ? 'transparent' : (isClassic ? '#e5e7eb' : '#f3f4f6'), 
        color: BRAND_COLOR,
        borderBottom: isClassic ? '1px solid #000' : `1px solid #e5e7eb`,
        borderRight: isClassic ? '1px solid #000' : 'none'
    },
    td: {
        padding: '12px',
        fontSize: '13px',
        borderBottom: isClassic ? '1px solid #000' : (isMinimal ? '1px solid #f3f4f6' : '1px solid #f3f4f6'),
        borderRight: isClassic ? '1px solid #000' : 'none',
        color: '#374151',
        verticalAlign: 'top',
        fontFamily: isClassic ? '"Times New Roman", serif' : 'inherit'
    },
    totalsContainer: {
        display: 'flex',
        justifyContent: 'flex-end',
        marginTop: '16px'
    },
    totalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '6px 0',
        fontSize: '13px',
        color: '#4b5563'
    },
    finalTotalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '12px 0 0 0',
        borderTop: isMinimal ? 'none' : `2px solid ${BRAND_COLOR}`, // Minimal no border
        marginTop: '8px',
        fontSize: isMinimal ? '20px' : '16px',
        fontWeight: 'bold',
        color: '#111827'
    },
    footer: {
        marginTop: 'auto',
        paddingTop: '40px',
        borderTop: isMinimal ? 'none' : '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
    },
    watermark: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) rotate(-45deg)',
        fontSize: `${watermarkSize}px`,
        fontWeight: 'bold',
        color: '#9ca3af',
        opacity: '0.08',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 0,
        textAlign: 'center'
    }
  };

  return (
    <div ref={ref} style={styles.container}>
       <div style={styles.watermark}>
           {watermarkText || companyDetails?.name || 'COMPANY NAME'}
       </div>
       
       {/* Header */}
       <div style={styles.headerRow}>
         <div style={styles.headerLeft}>
             {showLogo && logoImage && (
                 <img src={logoImage} alt="Logo" style={{ height: '60px', width: 'auto', objectFit: 'contain', marginBottom: '12px' }} />
             )}
             <h2 style={styles.companyName}>{companyDetails?.name || 'Your Company Name'}</h2>
             <p style={{...styles.companyAddress, marginTop: 0}}>{companyDetails?.address || 'Your Business Address'}</p>
             <div style={styles.phoneRow}>
                 <Phone size={14} style={{ marginRight: '6px', color: BRAND_COLOR }} />
                 <span style={{ fontWeight: 500 }}>{companyDetails?.phone || '+91 00000 00000'}</span>
             </div>
         </div>

         <div style={styles.headerRight}>
             <h1 style={styles.title}>{documentTitle}</h1>
             <div style={{ marginTop: '12px' }}>
                 <div style={styles.invoiceMetaRow}>
                     <span style={styles.metaLabel}>Invoice No:</span>
                     <span style={styles.metaValue}>{invoiceNumber}</span>
                 </div>
                 <div style={styles.invoiceMetaRow}>
                     <span style={styles.metaLabel}>Date:</span>
                     <span style={styles.metaValue}>{invoiceDate}</span>
                 </div>
             </div>
         </div>
       </div>

       {/* Billed To */}
       <div style={styles.billedToSection}>
         <div>
           <div style={styles.sectionLabel}>Billed To:</div>
           <p style={styles.customerName}>{customer.name || 'Customer Name'}</p>
           <p style={styles.customerDetails}>{customer.address || 'Address Line 1\nCity, State, Zip'}</p>
           {customer.phone && <p style={{...styles.customerDetails, marginTop: '4px'}}>Phone: {customer.phone}</p>}
         </div>
       </div>

       {/* Table */}
       <div style={{ flex: 1 }}> 
           <table style={styles.table}>
             <thead>
               <tr>
                 <th style={{...styles.th, width: '40%', borderTopLeftRadius: isClassic ? 0 : '4px'}}>Item Description</th>
                 <th style={{...styles.th, width: '15%', textAlign: 'center'}}>Qty</th>
                 <th style={{...styles.th, width: '20%', textAlign: 'right'}}>Price</th>
                 <th style={{...styles.th, width: '25%', textAlign: 'right', borderTopRightRadius: isClassic ? 0 : '4px', borderRight: isClassic ? '1px solid #000' : 'none'}}>Amount</th>
               </tr>
             </thead>
             <tbody>
               {items.map((item, index) => (
                 <tr key={index}>
                   <td style={styles.td}>
                       <div style={{ fontWeight: '600', color: '#111827' }}>{item.name}</div>
                   </td>
                   <td style={{...styles.td, textAlign: 'center'}}>{item.quantity}</td>
                   <td style={{...styles.td, textAlign: 'right'}}>₹{Number(item.price).toLocaleString()}</td>
                   <td style={{...styles.td, textAlign: 'right', fontWeight: 'bold', borderRight: isClassic ? '1px solid #000' : 'none'}}>₹{(Number(item.quantity) * Number(item.price)).toLocaleString()}</td>
                 </tr>
               ))}
             </tbody>
           </table>

           {/* Totals */}
           <div style={styles.totalsContainer}>
             <div style={styles.totalsBox}>
               <div style={styles.totalRow}>
                 <span>Subtotal</span>
                 <span style={{ fontWeight: '600', color: '#111827' }}>₹{subtotal.toLocaleString()}</span>
               </div>
               
               <div style={styles.finalTotalRow}>
                 <span>Total</span>
                 <span>₹{total.toLocaleString()}</span>
               </div>

               {payments && payments.length > 0 && totalPaid > 0 && (
                 <div style={{...styles.totalRow, marginTop: '8px', color: '#059669' }}>
                    <span>Amount Paid</span>
                    <span style={{ fontWeight: 'bold' }}>₹{totalPaid.toLocaleString()}</span>
                 </div>
               )}

               <div style={{...styles.totalRow, color: balanceDue > 0 ? '#dc2626' : '#059669', fontWeight: 'bold', fontSize: '14px', marginTop: '4px' }}>
                 <span>Balance Due</span>
                 <span>₹{balanceDue.toLocaleString()}</span>
               </div>
             </div>
           </div>
       </div>

       {/* Footer */}
       <div style={styles.footer}>
          <div style={styles.termsBox}>
             {paymentDetails.show && (
                 <div style={{ marginBottom: '20px' }}>
                      <div style={styles.sectionLabel}>Payment Options</div>
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                         {paymentDetails.phonePe && (
                             <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
                                 <img src={phonePeLogo} style={{height: '18px', width: 'auto', marginRight: '8px' }} alt="PhonePe"/>
                                 <span>{paymentDetails.phonePe}</span>
                             </div>
                         )}
                         {paymentDetails.googlePay && (
                             <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
                                 <img src={googlePayLogo} style={{height: '18px', width: 'auto', marginRight: '8px' }} alt="GPay"/>
                                 <span>{paymentDetails.googlePay}</span>
                             </div>
                         )}
                         {paymentDetails.upiId && (
                             <div style={{ display: 'flex', alignItems: 'center', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
                                 <span style={{ marginRight: '4px', fontWeight: 'bold', color: BRAND_COLOR }}>UPI:</span> {paymentDetails.upiId}
                             </div>
                         )}
                      </div>
                 </div>
             )}
             
             {showTerms && (
                 <div>
                     <div style={styles.sectionLabel}>Terms & Conditions</div>
                     <ul style={{ paddingLeft: '14px', margin: 0, fontSize: '11px', color: '#6b7280', lineHeight: '1.5' }}>
                         <li>Goods once sold will not be taken back.</li>
                         <li>Interest @ 18% p.a. will be charged if payment is not made within the due date.</li>
                         <li>Subject to local jurisdiction.</li>
                     </ul>
                 </div>
             )}
          </div>

          <div style={styles.signatoryBox}>
             {showSignature && (
                 <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100px' }}>
                     {signatureImage && <img src={signatureImage} style={{ maxHeight: '60px', marginBottom: '8px' }} alt="Signature" />}
                     <div style={{ borderTop: '1px solid #1f2937', width: '160px', paddingTop: '8px' }}>
                         <p style={{ fontSize: '11px', fontWeight: 'bold', margin: 0, textTransform: 'uppercase' }}>{companyDetails.name}</p>
                         <p style={{ fontSize: '11px', color: '#6b7280', margin: 0 }}>Authorized Signatory</p>
                     </div>
                 </div>
             )}
          </div>
       </div>

    </div>
  );
});

export default InvoiceTemplate;
