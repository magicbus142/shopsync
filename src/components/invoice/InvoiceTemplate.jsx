import React from 'react';
import phonePeLogo from '../../assets/phonepe.png'
import googlePayLogo from '../../assets/google-pay.png'

// Using forwardRef to be compatible with react-to-print
export const InvoiceTemplate = React.forwardRef(({ data }, ref) => {
  const { 
    customer, items, invoiceDate, invoiceNumber, subtotal, 
    total, payments = [], totalPaid = 0, balanceDue = 0, 
    showSignature, signatureImage, companyDetails, 
    showTerms, paymentDetails, showLogo, logoImage,
    watermarkText, watermarkSize = 80
  } = data;

  // Safe Inline Styles for PDF Generation (avoiding Tailwind classes)
  const styles = {
    container: {
        width: '210mm',
        minHeight: '297mm',
        padding: '32px',
        margin: '0 auto',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: '#ffffff',
        color: '#111827',
        boxSizing: 'border-box',
        position: 'relative', // For watermark positioning
        overflow: 'hidden' // Ensure watermark doesn't spill out
    },
    header: {
        marginBottom: '24px',
        paddingBottom: '16px',
        borderBottom: '2px solid #1f2937',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start'
    },
    title: {
        fontSize: '30px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: '0.025em',
        color: '#111827',
        margin: 0
    },
    companyName: {
        fontSize: '18px',
        marginTop: '4px',
        color: '#4b5563',
        margin: '4px 0 0 0'
    },
    textSmall: {
        fontSize: '14px',
        color: '#6b7280',
        margin: '0'
    },
    flexBetween: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '32px'
    },
    sectionTitle: {
        fontSize: '12px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        color: '#4b5563',
        marginBottom: '8px'
    },
    table: {
        width: '100%',
        marginBottom: '32px',
        borderCollapse: 'collapse'
    },
    th: {
        padding: '8px',
        textAlign: 'left',
        fontSize: '12px',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        border: '1px solid #1f2937',
        backgroundColor: '#f3f4f6'
    },
    td: {
        padding: '8px',
        border: '1px solid #1f2937',
        fontSize: '12px'
    },
    totalRow: {
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderBottom: '2px solid #1f2937',
        marginTop: '8px'
    },
    footer: {
        marginTop: 'auto',
        paddingTop: '32px',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end'
    },
    watermark: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%) rotate(-45deg)',
        fontSize: `${watermarkSize}px`, // Dynamic Size
        fontWeight: 'bold',
        color: '#9ca3af', // Gray-400 equivalent
        opacity: '0.1',   // Very faint
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        zIndex: 0,
        width: '100%',
        textAlign: 'center'
    }
  };

  return (
    <div ref={ref} style={styles.container}>
      {/* Watermark */}
      <div style={styles.watermark}>
          {watermarkText || companyDetails?.name || 'COMPANY NAME'}
      </div>
      
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Invoice</h1>
          <p style={styles.companyName}>{companyDetails?.name || 'Company Name'}</p>
          <p style={{...styles.textSmall, whiteSpace: 'pre-line', maxWidth: '320px'}}>{companyDetails?.address || 'Address Here'}</p>
          <p style={styles.textSmall}>Phone: {companyDetails?.phone || 'Phone Number'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
           {showLogo && (
               logoImage ? (
                  <img src={logoImage} alt="Logo" style={{ height: '96px', width: 'auto', objectFit: 'contain', marginLeft: 'auto' }} />
               ) : (
                  <div style={{ width: '96px', height: '96px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', marginBottom: '8px', marginLeft: 'auto', backgroundColor: '#f3f4f6', border: '1px dashed #d1d5db' }}>
                     <span style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>Logo Area</span>
                  </div>
               )
           )}
        </div>
      </div>

      {/* Info Section */}
      <div style={styles.flexBetween}>
        <div>
          <h3 style={styles.sectionTitle}>Billed To:</h3>
          <p style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>{customer.name || 'Customer Name'}</p>
          <p style={{ color: '#4b5563', margin: 0 }}>{customer.phone}</p>
          <p style={{ color: '#4b5563', whiteSpace: 'pre-line', maxWidth: '320px', margin: 0 }}>{customer.address}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ marginBottom: '8px' }}>
            <span style={styles.sectionTitle}>Invoice No:</span>
            <p style={{ fontWeight: 'bold', margin: 0 }}>{invoiceNumber || 'INV-001'}</p>
          </div>
          <div>
            <span style={styles.sectionTitle}>Date:</span>
            <p style={{ fontWeight: 'bold', margin: 0 }}>{invoiceDate}</p>
          </div>
        </div>
      </div>

      {/* Items Table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{...styles.th, width: '80px'}}>Date</th>
            <th style={styles.th}>Item</th>
            <th style={{...styles.th, width: '80px', textAlign: 'center'}}>Qty</th>
            <th style={{...styles.th, width: '112px', textAlign: 'right'}}>Price</th>
            <th style={{...styles.th, width: '112px', textAlign: 'right'}}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={index}>
              <td style={styles.td}>{item.date}</td>
              <td style={styles.td}>{item.name || 'Item Name'}</td>
              <td style={{...styles.td, textAlign: 'center'}}>{item.quantity}</td>
              <td style={{...styles.td, textAlign: 'right'}}>₹{Number(item.price).toFixed(2)}</td>
              <td style={{...styles.td, textAlign: 'right', fontWeight: '500'}}>₹{Number(item.quantity * item.price).toFixed(2)}</td>
            </tr>
          ))}
          {items.length === 0 && (
             <tr>
                 <td colSpan="5" style={{...styles.td, padding: '32px', textAlign: 'center', fontStyle: 'italic', color: '#9ca3af'}}>No items added</td>
             </tr>
          )}
        </tbody>
      </table>

      {/* Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '48px' }}>
        <div style={{ width: '256px' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #d1d5db' }}>
              <span style={{ fontWeight: '500', color: '#4b5563' }}>Subtotal:</span>
              <span style={{ fontWeight: 'bold' }}>₹{subtotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
           </div>
           
           <div style={styles.totalRow}>
              <span style={{ fontWeight: 'bold', fontSize: '18px' }}>Total:</span>
              <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#2563eb' }}>₹{total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
           </div>
           
           {(payments.length > 0) && (
               <>
                   <div style={{ marginTop: '16px', paddingTop: '8px', borderTop: '1px solid #d1d5db' }}>
                       <p style={{ fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '4px', color: '#4b5563' }}>Payment History</p>
                       {payments.map(p => (
                           <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', padding: '2px 0' }}>
                               <span>{p.date}</span>
                               <span>- ₹{Number(p.amount).toLocaleString()}</span>
                           </div>
                       ))}
                   </div>

                   <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', marginTop: '8px', borderTop: '1px solid #1f2937' }}>
                      <span style={{ fontWeight: '500', color: '#1f2937' }}>Total Paid:</span>
                      <span style={{ fontWeight: 'bold', color: '#16a34a' }}>₹{totalPaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                   </div>
                   <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: '4px', borderTop: '2px solid #1f2937', borderBottom: '2px solid #1f2937' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#1f2937' }}>Balance Due:</span>
                      <span style={{ fontWeight: 'bold', fontSize: '16px', color: '#dc2626' }}>₹{balanceDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                   </div>
               </>
           )}
        </div>
      </div>

      {/* Footer */}
      <div style={styles.footer}>
           <div style={{ flex: '1 1 0%', paddingRight: '16px' }}>
               {paymentDetails?.show && (
                   <div style={{ marginBottom: '24px' }}>
                       <p style={styles.sectionTitle}>Payment Options</p>
                       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '24px', rowGap: '8px', fontSize: '12px', maxWidth: '320px' }}>
                           {paymentDetails.phonePe && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <img src={phonePeLogo} alt="PhonePe" style={{ height: '32px', objectFit: 'contain' }} />
                                 <span style={{ fontWeight: '500', fontSize: '14px' }}>{paymentDetails.phonePe}</span>
                              </div>
                           )}
                           {paymentDetails.googlePay && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                 <img src={googlePayLogo} alt="GPay" style={{ height: '32px', objectFit: 'contain' }} />
                                 <span style={{ fontWeight: '500', fontSize: '14px' }}>{paymentDetails.googlePay}</span>
                              </div>
                           )}
                           {paymentDetails.upiId && (
                              <div style={{ gridColumn: '1 / span 2', paddingTop: '4px', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px', borderTop: '1px dashed #d1d5db' }}>
                                 <span style={{ fontWeight: 'bold', color: '#4b5563' }}>UPI ID:</span> 
                                 <span style={{ fontFamily: 'monospace' }}>{paymentDetails.upiId}</span>
                              </div>
                           )}
                       </div>
                   </div>
               )}
            
               {showTerms && (
                   <div>
                      <p style={styles.sectionTitle}>Terms & Conditions</p>
                      <ul style={{ fontSize: '12px', listStyleType: 'disc', paddingLeft: '16px', color: '#6b7280', margin: 0 }}>
                         <li style={{ marginBottom: '4px' }}>Goods once sold will not be taken back.</li>
                         <li>All disputes subject to local jurisdiction.</li>
                       </ul>
                   </div>
               )}
           </div>
           <div style={{ textAlign: 'center' }}>
              {showSignature && (
                 <>
                     <div style={{ height: '64px', width: '128px', marginBottom: '8px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                         {signatureImage ? (
                             <img src={signatureImage} alt="Signature" style={{ maxHeight: '64px', maxWidth: '100%', objectFit: 'contain' }} />
                         ) : (
                             <div style={{ width: '100%', height: '100%', borderBottom: '1px solid #9ca3af' }} />
                         )}
                     </div>
                     <p style={{ fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', margin: 0 }}>Authorized Signatory</p>
                 </>
              )}
           </div>
      </div>
    </div>
  );
});

export default InvoiceTemplate;
