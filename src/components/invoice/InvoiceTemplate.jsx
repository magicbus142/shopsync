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
    watermarkText, watermarkSize = 80,
    documentTitle = 'INVOICE' // Default to INVOICE if not provided
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
           <h1 style={styles.title}>{documentTitle}</h1>
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

      {/* Bill To */}
      <div style={styles.flexBetween}>
        <div>
          <h3 style={styles.sectionTitle}>Billed To:</h3>
          <p style={{...styles.textSmall, fontWeight: 'bold', color: '#111827'}}>{customer.name || 'Customer Name'}</p>
          <p style={{...styles.textSmall, whiteSpace: 'pre-line', maxWidth: '300px'}}>{customer.address || 'Customer Address'}</p>
          <p style={styles.textSmall}>{customer.phone || 'Customer Phone'}</p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <h3 style={styles.sectionTitle}>Invoice Details:</h3>
          <p style={styles.textSmall}><strong>Invoice No:</strong> {invoiceNumber}</p>
          <p style={styles.textSmall}><strong>Date:</strong> {invoiceDate}</p>
        </div>
      </div>

      {/* Items Table */}
      <div style={{ flex: 1 }}> {/* Ensure table takes space but pushes footer down */}
          <table style={styles.table}>
            <thead>
              <tr style={{ backgroundColor: '#f3f4f6' }}>
                <th style={{...styles.th, width: '40%'}}>Item Description</th>
                <th style={{...styles.th, width: '20%', textAlign: 'center'}}>Qty</th>
                <th style={{...styles.th, width: '20%', textAlign: 'right'}}>Price</th>
                <th style={{...styles.th, width: '20%', textAlign: 'right'}}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  <td style={styles.td}>{item.name}</td>
                  <td style={{...styles.td, textAlign: 'center'}}>{item.quantity}</td>
                  <td style={{...styles.td, textAlign: 'right'}}>₹{Number(item.price).toLocaleString()}</td>
                  <td style={{...styles.td, textAlign: 'right'}}>₹{(Number(item.quantity) * Number(item.price)).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ marginLeft: 'auto', width: '50%' }}>
            <div style={styles.totalRow}>
              <span style={styles.textSmall}>Subtotal:</span>
              <span style={{...styles.textSmall, fontWeight: 'bold'}}>₹{subtotal.toLocaleString()}</span>
            </div>
            {/* Show other totals if needed (Tax, Discount etc in future) */}
            <div style={{...styles.totalRow, borderBottom: 'none'}}>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Total:</span>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>₹{total.toLocaleString()}</span>
            </div>
            
            {payments && payments.length > 0 && (
                <>
                    <div style={{...styles.totalRow, marginTop: '16px', borderTop: '1px dashed #d1d5db', paddingTop: '8px' }}>
                        <span style={styles.textSmall}>Amount Paid:</span>
                        <span style={{...styles.textSmall, fontWeight: 'bold', color: '#059669'}}>₹{totalPaid.toLocaleString()}</span>
                    </div>
                </>
            )}

            <div style={{...styles.totalRow, borderTop: '2px solid #1f2937', marginTop: '4px', paddingTop: '8px' }}>
              <span style={{ fontSize: '16px', fontWeight: 'bold' }}>Balance Due:</span>
              <span style={{ fontSize: '16px', fontWeight: 'bold', color: balanceDue > 0 ? '#dc2626' : '#059669' }}>
                  ₹{balanceDue.toLocaleString()}
              </span>
            </div>
          </div>
      </div>

      {/* Footer Section */}
      <div style={styles.footer}>
         <div style={{ width: '60%' }}>
            {/* Payment Details */}
            {paymentDetails.show && (
                <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '4px' }}>
                     <h4 style={{...styles.sectionTitle, marginBottom: '4px'}}>Payment Options</h4>
                     <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: '#4b5563', flexWrap: 'wrap' }}>
                        {paymentDetails.phonePe && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <img src={phonePeLogo} style={{height: '12px'}} alt="PhonePe"/> {paymentDetails.phonePe}
                            </div>
                        )}
                        {paymentDetails.googlePay && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <img src={googlePayLogo} style={{height: '12px'}} alt="GPay"/> {paymentDetails.googlePay}
                            </div>
                        )}
                        {paymentDetails.upiId && <span>UPI: {paymentDetails.upiId}</span>}
                     </div>
                </div>
            )}
            
            {/* Terms */}
            {showTerms && (
                <div>
                    <h4 style={styles.sectionTitle}>Terms & Conditions</h4>
                    <p style={{ fontSize: '10px', color: '#6b7280', margin: 0 }}>
                        1. Goods once sold will not be taken back.<br/>
                        2. Interest @ 18% p.a. will be charged if payment is not made within the due date.<br/>
                        3. Subject to local jurisdiction.
                    </p>
                </div>
            )}
         </div>

         {/* Signature */}
         <div style={{ textAlign: 'center' }}>
            {showSignature && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '80px' }}>
                    {signatureImage && <img src={signatureImage} style={{ maxHeight: '60px', marginBottom: '4px' }} alt="Signature" />}
                    <div style={{ borderTop: '1px solid #1f2937', width: '150px', paddingTop: '4px' }}>
                        <p style={{ fontSize: '10px', fontWeight: 'bold', margin: 0 }}>{companyDetails.name}</p>
                        <p style={{ fontSize: '10px', color: '#6b7280', margin: 0 }}>Authorized Signatory</p>
                    </div>
                </div>
            )}
         </div>
      </div>

    </div>
  );
});

export default InvoiceTemplate;
