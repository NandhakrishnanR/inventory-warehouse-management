# -*- coding: utf-8 -*-
import os
import subprocess

EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
NOTES_DIR = r"C:\Nandhu\Learning\projects\enterprise-inventory-warehouse-management-ERP\notes"

COMMON_CSS = """
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Mukta+Malar:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap');
  
  @page {
    size: A4;
    margin: 14mm 14mm 14mm 14mm;
  }
  
  * {
    box-sizing: border-box;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  
  body {
    font-family: 'Inter', 'Nirmala UI', 'Mukta Malar', 'Noto Sans Tamil', system-ui, -apple-system, sans-serif;
    color: #1e293b;
    background: #ffffff;
    line-height: 1.5;
    font-size: 11pt;
    margin: 0;
    padding: 0;
  }
  
  .tamil-text {
    font-family: 'Nirmala UI', 'Mukta Malar', 'Noto Sans Tamil', 'Latha', sans-serif;
    line-height: 1.6;
  }
  
  .page-break {
    page-break-after: always;
  }
  
  .cover {
    min-height: 90vh;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding: 40px 20px;
    border-bottom: 2px solid #e2e8f0;
  }
  
  .brand-badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    background: #0284c7;
    color: white;
    padding: 8px 16px;
    border-radius: 12px;
    font-weight: 800;
    font-size: 14pt;
    letter-spacing: -0.5px;
  }
  
  .hero-title {
    font-size: 28pt;
    font-weight: 800;
    color: #0f172a;
    line-height: 1.2;
    margin: 24px 0 12px 0;
    letter-spacing: -0.5px;
  }
  
  .hero-sub {
    font-size: 13pt;
    color: #64748b;
    margin-bottom: 30px;
  }
  
  .meta-box {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 20px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
    font-size: 10pt;
  }
  
  .meta-item strong {
    color: #0f172a;
    display: block;
    font-size: 9pt;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 2px;
  }
  
  h1.section-title {
    font-size: 18pt;
    font-weight: 800;
    color: #0f172a;
    border-bottom: 2px solid #0284c7;
    padding-bottom: 8px;
    margin-top: 24px;
    margin-bottom: 16px;
  }
  
  h2.sub-title {
    font-size: 13pt;
    font-weight: 700;
    color: #1e293b;
    margin-top: 18px;
    margin-bottom: 8px;
  }
  
  .step-card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-left: 4px solid #0284c7;
    border-radius: 10px;
    padding: 14px 16px;
    margin-bottom: 14px;
  }
  
  .step-card.purple { border-left-color: #9333ea; }
  .step-card.green { border-left-color: #16a34a; }
  .step-card.amber { border-left-color: #d97706; }
  .step-card.teal { border-left-color: #0d9488; }
  .step-card.rose { border-left-color: #e11d48; }
  
  .step-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 700;
    font-size: 11pt;
    color: #0f172a;
    margin-bottom: 6px;
  }
  
  .badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 6px;
    font-size: 8.5pt;
    font-weight: 700;
    font-family: 'JetBrains Mono', monospace;
  }
  
  .badge-blue { background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; }
  .badge-green { background: #dcfce7; color: #15803d; border: 1px solid #bbf7d0; }
  .badge-amber { background: #fef3c7; color: #b45309; border: 1px solid #fde68a; }
  .badge-purple { background: #f3e8ff; color: #7e22ce; border: 1px solid #e9d5ff; }
  .badge-slate { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
  
  table.data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 9.5pt;
  }
  
  table.data-table th {
    background: #f1f5f9;
    color: #334155;
    font-weight: 700;
    text-align: left;
    padding: 8px 10px;
    border: 1px solid #cbd5e1;
    font-size: 8.5pt;
    text-transform: uppercase;
  }
  
  table.data-table td {
    padding: 8px 10px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
  }
  
  table.data-table tr:nth-child(even) td {
    background: #f8fafc;
  }
  
  .callout {
    background: #eff6ff;
    border: 1px solid #bfdbfe;
    border-radius: 10px;
    padding: 12px 16px;
    font-size: 10pt;
    margin: 14px 0;
    color: #1e40af;
  }
  
  .callout strong {
    color: #1d4ed8;
  }
  
  .code-pill {
    background: #e2e8f0;
    padding: 2px 6px;
    border-radius: 4px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 9pt;
  }
  
  .flow-diagram {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 12px;
    margin: 14px 0;
    font-size: 9pt;
    font-weight: 700;
    text-align: center;
  }
  
  .flow-step {
    flex: 1;
    background: white;
    border: 1px solid #cbd5e1;
    border-radius: 8px;
    padding: 8px 6px;
    box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  }
  
  .flow-arrow {
    padding: 0 6px;
    color: #0284c7;
    font-size: 14pt;
    font-weight: bold;
  }
"""

def generate_english_html():
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Apex ERP - Complete Step-by-Step User & Operations Guide</title>
  <style>{COMMON_CSS}</style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover">
    <div>
      <div class="brand-badge">APEX ERP Enterprise</div>
      <div class="hero-title">Complete Step-by-Step Operations & Workflow Guide</div>
      <div class="hero-sub">Multi-Location Inventory, Warehouse Topology, Double-Entry Stock Ledger, Procurement Approvals & RBAC Security Governance</div>
    </div>
    
    <div>
      <div class="meta-box">
        <div class="meta-item">
          <strong>System Release</strong>
          v1.0.0 Enterprise Warehouse Edition
        </div>
        <div class="meta-item">
          <strong>Frontend Web Portal</strong>
          React 18 + Vite (Port 5173)
        </div>
        <div class="meta-item">
          <strong>Backend API Service</strong>
          Express + TypeScript + Prisma ORM (Port 5001)
        </div>
        <div class="meta-item">
          <strong>ACID Database</strong>
          PostgreSQL 15 (Port 5434)
        </div>
      </div>
    </div>
  </div>
  
  <div class="page-break"></div>
  
  <!-- Table of Contents -->
  <h1 class="section-title">Table of Contents</h1>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 15%;">Section</th>
        <th>Workflow Module</th>
        <th style="width: 25%;">Target Roles</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1.0</strong></td>
        <td>System Architecture & 1-Click Login Personas</td>
        <td>All Users</td>
      </tr>
      <tr>
        <td><strong>2.0</strong></td>
        <td>Role-Based Access Control (RBAC) & Permission Matrix</td>
        <td>Admin, Managers, Auditors</td>
      </tr>
      <tr>
        <td><strong>3.0</strong></td>
        <td>Workflow 1: Warehouse & Bin Hierarchy Setup (/hierarchy)</td>
        <td>Warehouse Manager, Admin</td>
      </tr>
      <tr>
        <td><strong>4.0</strong></td>
        <td>Workflow 2: Product Master Catalog Management (/products)</td>
        <td>Inventory Manager, Admin</td>
      </tr>
      <tr>
        <td><strong>5.0</strong></td>
        <td>Workflow 3: Procurement & Approval Lifecycle (/procurement & /approvals)</td>
        <td>Dept Head, Finance, Procurement</td>
      </tr>
      <tr>
        <td><strong>6.0</strong></td>
        <td>Workflow 4: Goods Receiving Dock & Bin Putaway (/receiving)</td>
        <td>Warehouse Staff, Supervisor</td>
      </tr>
      <tr>
        <td><strong>7.0</strong></td>
        <td>Workflow 5: Inter-Warehouse Stock Transfers (/transfers)</td>
        <td>Warehouse Mgr, Logistics Staff</td>
      </tr>
      <tr>
        <td><strong>8.0</strong></td>
        <td>Workflow 6: Physical Cycle Counting & Variance Postings (/stock-counts)</td>
        <td>Inventory Mgr, Warehouse Staff</td>
      </tr>
      <tr>
        <td><strong>9.0</strong></td>
        <td>Workflow 7: Financial Valuation Reports & Immutable Audit Trail (/reports & /audit)</td>
        <td>Finance Approver, Auditor, Admin</td>
      </tr>
      <tr>
        <td><strong>10.0</strong></td>
        <td>Theme Switching & Database Inspection Guide</td>
        <td>Technical Operations & Developers</td>
      </tr>
    </tbody>
  </table>
  
  <!-- Section 1 -->
  <h1 class="section-title">1.0 System Architecture & 1-Click Login Personas</h1>
  <p>The <strong>Apex Enterprise ERP</strong> is engineered for high-precision multi-location supply chain management. It enforces strict ACID compliance where every physical inventory movement writes an immutable debit/credit transaction to the stock ledger.</p>
  
  <div class="callout">
    <strong>Default Credentials:</strong> All seeded accounts use the universal password <span class="code-pill">Password123!</span>. You can switch between demo personas instantly from the top navigation bar or the login screen.
  </div>
  
  <table class="data-table">
    <thead>
      <tr>
        <th>Persona</th>
        <th>Username</th>
        <th>System Role</th>
        <th>Primary Functional Responsibilities</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>System Administrator</strong></td>
        <td><span class="code-pill">admin</span></td>
        <td><span class="badge badge-purple">ADMIN</span></td>
        <td>Full global rights, user management, role assignments, system-wide overrides.</td>
      </tr>
      <tr>
        <td><strong>Inventory Manager</strong></td>
        <td><span class="code-pill">inv_manager</span></td>
        <td><span class="badge badge-blue">INVENTORY_MANAGER</span></td>
        <td>Product catalog master, UoM conversions, reorder thresholds, variance reconciliation.</td>
      </tr>
      <tr>
        <td><strong>Warehouse Manager</strong></td>
        <td><span class="code-pill">wh_manager</span></td>
        <td><span class="badge badge-blue">WAREHOUSE_MANAGER</span></td>
        <td>Warehouse topology, zones, racks, storage bins, inter-facility transfer dispatch.</td>
      </tr>
      <tr>
        <td><strong>Warehouse Staff</strong></td>
        <td><span class="code-pill">wh_staff</span></td>
        <td><span class="badge badge-green">WAREHOUSE_STAFF</span></td>
        <td>Dock receiving (GRN), physical bin putaway, transfer intake, barcode counts.</td>
      </tr>
      <tr>
        <td><strong>Procurement Officer</strong></td>
        <td><span class="code-pill">proc_officer</span></td>
        <td><span class="badge badge-amber">PROCUREMENT_OFFICER</span></td>
        <td>Supplier master records, purchase order generation, contractual terms.</td>
      </tr>
      <tr>
        <td><strong>Department Head</strong></td>
        <td><span class="code-pill">dept_manager</span></td>
        <td><span class="badge badge-purple">DEPARTMENT_MANAGER</span></td>
        <td>Initiates and submits departmental purchase requisitions (PR) for operational needs.</td>
      </tr>
      <tr>
        <td><strong>Finance Approver</strong></td>
        <td><span class="code-pill">fin_approver</span></td>
        <td><span class="badge badge-green">FINANCE_APPROVER</span></td>
        <td>Budget line verification, capital expenditure authorizations, final sign-off.</td>
      </tr>
      <tr>
        <td><strong>Internal Auditor</strong></td>
        <td><span class="code-pill">auditor</span></td>
        <td><span class="badge badge-slate">AUDITOR</span></td>
        <td>Strict read-only compliance inspection, immutable ledger review, before/after JSON diffs.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- Section 2 -->
  <h1 class="section-title">2.0 Role-Based Access Control (RBAC) Governance</h1>
  <p>The ERP features a granular permission engine. Each role is bound to a defined subset of the 25+ permissions seeded in the PostgreSQL database. Separation of duties prevents conflict of interest (e.g., users cannot approve their own purchase requisitions).</p>

  <div class="step-card purple">
    <div class="step-header">
      <span>How to Manage Users & Review Permission Matrix (/users)</span>
      <span class="badge badge-purple">ADMIN ONLY</span>
    </div>
    <ol>
      <li>Log in as <span class="code-pill">admin</span> and navigate to <strong>Users & Permissions</strong> from the sidebar.</li>
      <li><strong>User Directory Tab:</strong> Search by employee name, corporate email, or department. Review assigned warehouse scopes and status.</li>
      <li><strong>Suspend / Reactivate:</strong> Click the <span class="badge badge-rose">Suspend</span> button on any active user to revoke immediate API token validation.</li>
      <li><strong>Role Assignment:</strong> Click <span class="badge badge-blue">+ Role</span> to add secondary roles or remove existing role badges.</li>
      <li><strong>Permission Matrix Tab:</strong> Review the interactive matrix showing exactly which granular gates (e.g., <span class="code-pill">inventory:write</span>, <span class="code-pill">procurement:approve</span>) each role possesses.</li>
    </ol>
  </div>

  <!-- Section 3 -->
  <h1 class="section-title">3.0 Workflow 1: Warehouse & Bin Hierarchy Setup</h1>
  <p>Storage locations are modeled in an 8-level physical topology: <strong>Company &rarr; Region &rarr; City &rarr; Site &rarr; Warehouse &rarr; Zone &rarr; Rack &rarr; Storage Bin</strong>.</p>
  
  <div class="flow-diagram">
    <div class="flow-step">Apex Corp<br><span style="font-size:8pt;color:#64748b;">Company</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">Central Region<br><span style="font-size:8pt;color:#64748b;">Region / City</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">Main Depot<br><span style="font-size:8pt;color:#64748b;">Warehouse</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">Zone A (Dry)<br><span style="font-size:8pt;color:#64748b;">Zone</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">Rack R01<br><span style="font-size:8pt;color:#64748b;">Rack</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">Bin A-01-01<br><span style="font-size:8pt;color:#64748b;">Storage Bin</span></div>
  </div>

  <div class="step-card blue">
    <div class="step-header">
      <span>Step-by-Step Topology Setup Instructions</span>
      <span class="badge badge-blue">WAREHOUSE_MANAGER</span>
    </div>
    <ol>
      <li>Navigate to <strong>Warehouse Tree</strong> (<span class="code-pill">/hierarchy</span>) in the sidebar.</li>
      <li>Expand any node to inspect child facilities, warehouses, and storage zones.</li>
      <li>Click on any <strong>Bin Code</strong> (e.g., <span class="code-pill">BIN-A-01-01</span>) in the tree. The right-hand inspector will instantly display:
        <ul>
          <li>Bin storage type (<span class="code-pill">STORAGE</span>, <span class="code-pill">STAGING</span>, or <span class="code-pill">COLD_STORAGE</span>).</li>
          <li>Physical on-hand items, batches, and unit quantities currently occupying the bin.</li>
        </ul>
      </li>
      <li>To expand warehouse capacity, click <strong>Add Bin</strong>, select the target facility, zone, and rack, then specify the unique bin barcode.</li>
    </ol>
  </div>

  <div class="page-break"></div>

  <!-- Section 4 -->
  <h1 class="section-title">4.0 Workflow 2: Product Master Catalog Management</h1>
  <p>Standardized item records ensure accurate replenishment thresholds, barcoding, and automated low-stock warnings.</p>

  <div class="step-card green">
    <div class="step-header">
      <span>Adding and Managing SKUs (/products)</span>
      <span class="badge badge-green">INVENTORY_MANAGER</span>
    </div>
    <ol>
      <li>Navigate to <strong>Product Master</strong> (<span class="code-pill">/products</span>).</li>
      <li>Click <strong>+ New Product</strong> to open the item creation dialog.</li>
      <li>Fill in required parameters:
        <ul>
          <li><strong>SKU Code:</strong> Unique product identifier (e.g., <span class="code-pill">SKU-BRG-200</span>).</li>
          <li><strong>Product Name:</strong> Descriptive item label (e.g., Precision Ball Bearing 12mm).</li>
          <li><strong>Category & UoM:</strong> Select item group and unit (Pieces, Kilograms, Liters).</li>
          <li><strong>Inventory Thresholds:</strong> Set <span class="code-pill">Min Stock</span> (10), <span class="code-pill">Max Stock</span> (500), and <span class="code-pill">Reorder Level</span> (25).</li>
          <li><strong>Financial Values:</strong> Enter standard Cost Price ($) and Selling Price ($).</li>
        </ul>
      </li>
      <li>Save the record. The system automatically computes stock status badges:
        <span class="badge badge-green">NORMAL</span>, <span class="badge badge-amber">LOW STOCK</span>, or <span class="badge badge-rose">OUT OF STOCK</span>.
      </li>
    </ol>
  </div>

  <!-- Section 5 -->
  <h1 class="section-title">5.0 Workflow 3: Procurement & Approval Lifecycle</h1>
  <p>Procurement follows a rigorous three-step gate: <strong>Requisition &rarr; Multi-Tier Workflow Approval &rarr; Purchase Order</strong>.</p>

  <div class="flow-diagram">
    <div class="flow-step">1. Create PR<br><span style="font-size:8pt;color:#64748b;">Dept Head</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">2. Submit PR<br><span style="font-size:8pt;color:#64748b;">Workflow Engine</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">3. Approval Inbox<br><span style="font-size:8pt;color:#64748b;">Dept Mgr & Finance</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">4. Issue PO<br><span style="font-size:8pt;color:#64748b;">Procurement Officer</span></div>
  </div>

  <div class="step-card purple">
    <div class="step-header">
      <span>Phase 1: Submitting Purchase Requisitions (/procurement)</span>
      <span class="badge badge-purple">DEPARTMENT_MANAGER</span>
    </div>
    <ol>
      <li>Log in as <span class="code-pill">dept_manager</span> and visit <strong>Procurement & PO</strong>.</li>
      <li>Click <strong>New Requisition</strong>. Select Department, Product, Requested Quantity, and provide justification.</li>
      <li>On the draft row, click <strong>Submit Approval</strong>. This transitions the document into <span class="badge badge-amber">SUBMITTED</span> status and invokes the sequential approval engine.</li>
    </ol>
  </div>

  <div class="step-card green">
    <div class="step-header">
      <span>Phase 2: Reviewing in Approval Inbox (/approvals)</span>
      <span class="badge badge-green">FINANCE_APPROVER</span>
    </div>
    <ol>
      <li>Switch persona to <span class="code-pill">fin_approver</span>. Notice the inbox counter badge updates.</li>
      <li>Visit <strong>Approval Inbox</strong> (<span class="code-pill">/approvals</span>).</li>
      <li>Inspect the requisition details, justification, and estimated total expenditure.</li>
      <li>Choose one of three authorized actions:
        <ul>
          <li><strong>Approve Step:</strong> Advances workflow to final approval and updates underlying PR to <span class="badge badge-green">APPROVED</span>.</li>
          <li><strong>Return for Edit:</strong> Sends document back to draft for the initiator to revise quantities.</li>
          <li><strong>Reject:</strong> Immediately closes the requisition with mandatory reason comments.</li>
        </ul>
      </li>
    </ol>
  </div>

  <div class="step-card amber">
    <div class="step-header">
      <span>Phase 3: Generating Vendor Purchase Order (/procurement)</span>
      <span class="badge badge-amber">PROCUREMENT_OFFICER</span>
    </div>
    <ol>
      <li>Switch persona to <span class="code-pill">proc_officer</span>.</li>
      <li>Click <strong>Create Purchase Order</strong>. Choose registered Supplier, Product SKU, contracted unit price, and payment terms.</li>
      <li>Save the PO. It is assigned a tracking number (e.g., <span class="code-pill">PO-2026-001</span>) and set to <span class="badge badge-blue">ORDERED</span>.</li>
    </ol>
  </div>

  <div class="page-break"></div>

  <!-- Section 6 -->
  <h1 class="section-title">6.0 Workflow 4: Goods Receiving Dock & Bin Putaway</h1>
  <p>Receiving at the dock does not immediately increase general sellable balance until items pass quality check and are placed in specific bins.</p>

  <div class="step-card blue">
    <div class="step-header">
      <span>Dock Receiving & Bin Putaway Procedure (/receiving)</span>
      <span class="badge badge-blue">WAREHOUSE_STAFF</span>
    </div>
    <ol>
      <li>Log in as <span class="code-pill">wh_staff</span> and open <strong>Receiving & Putaway</strong>.</li>
      <li><strong>Generate GRN (Goods Receipt Note):</strong> Click <span class="badge badge-blue">Generate GRN</span> when the delivery truck arrives.
        <ul>
          <li>Select Supplier, Receiving Warehouse facility, Product, and delivered quantity.</li>
          <li>Enter physical inspection breakdown: <span class="code-pill">Accepted Qty</span> (e.g., 95) vs <span class="code-pill">Damaged Qty</span> (e.g., 5).</li>
          <li>Specify the supplier's Batch/Lot number for traceability.</li>
        </ul>
      </li>
      <li><strong>Automated Putaway Task:</strong> The system automatically writes the GRN and generates a pending putaway task for the accepted units, targeting the optimal bin.</li>
      <li><strong>Confirm Bin Placement:</strong> In the <em>Pending Putaway Tasks</em> tab, review the target bin code (e.g., <span class="code-pill">BIN-A-01-02</span>) and click <strong>Confirm Putaway to Bin</strong>.</li>
      <li><strong>ACID Ledger Posting:</strong> The system atomics writes a <span class="badge badge-green">RECEIPT</span> posting to the double-entry stock ledger, crediting available balance in that specific bin.</li>
    </ol>
  </div>

  <!-- Section 7 -->
  <h1 class="section-title">7.0 Workflow 5: Inter-Warehouse Stock Transfers</h1>
  <p>Moving stock between distant hubs utilizes an in-transit buffer ledger to ensure zero loss or double-counting during transit.</p>

  <div class="flow-diagram">
    <div class="flow-step">1. Initiate Transfer<br><span style="font-size:8pt;color:#64748b;">Source Wh</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">2. Dispatch Truck<br><span style="font-size:8pt;color:#64748b;">Deduct Source &rarr; Transit</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">3. In-Transit Ledger<br><span style="font-size:8pt;color:#64748b;">Carrier Tracking</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">4. Receive at Dest<br><span style="font-size:8pt;color:#64748b;">Put into Dest Bin</span></div>
  </div>

  <div class="step-card amber">
    <div class="step-header">
      <span>Executing Inter-Facility Transfers (/transfers)</span>
      <span class="badge badge-amber">WAREHOUSE_MANAGER & STAFF</span>
    </div>
    <ol>
      <li>Visit <strong>Stock Transfers</strong> (<span class="code-pill">/transfers</span>).</li>
      <li>Click <strong>Initiate Transfer</strong>. Select Source Warehouse, Destination Warehouse, Product, and requested units.</li>
      <li><strong>Dispatching:</strong> When freight departs, click <strong>Dispatch Stock</strong>. Enter carrier name and freight tracking code. Source on-hand balance is immediately debited, and units move to <span class="badge badge-blue">IN_TRANSIT</span>.</li>
      <li><strong>Destination Intake:</strong> When the truck arrives at the receiving facility, the destination staff clicks <strong>Receive Goods</strong>, selects the local destination bin, and records actual count.</li>
      <li><strong>Discrepancy Ledger:</strong> If received units are less than dispatched, the system flags a discrepancy shortage and triggers an audit log.</li>
    </ol>
  </div>

  <div class="page-break"></div>

  <!-- Section 8 -->
  <h1 class="section-title">8.0 Workflow 6: Physical Cycle Counting & Reconciliation</h1>
  <p>Cycle counting reconciles system balances against physical reality without stopping warehouse operations.</p>

  <div class="step-card teal">
    <div class="step-header">
      <span>Cycle Count & Variance Reconciliation (/stock-counts)</span>
      <span class="badge badge-teal">INVENTORY_MANAGER & STAFF</span>
    </div>
    <ol>
      <li>Visit <strong>Counts & Variance</strong> (<span class="code-pill">/stock-counts</span>).</li>
      <li>Click <strong>New Cycle Count</strong>. Select Target Warehouse and methodology (Cycle Count, Full Inventory, Spot Check).</li>
      <li>The system captures an immutable snapshot of current balances across all bins.</li>
      <li><strong>Record Physical Counts:</strong> Staff walks aisles and records counted physical items. Select reason code if variance is detected (<span class="code-pill">SURPLUS</span>, <span class="code-pill">LOSS</span>, <span class="code-pill">DAMAGE</span>).</li>
      <li><strong>Post Adjustments:</strong> The Inventory Manager reviews computed variances and clicks <strong>Post Adjustments</strong>. The system posts atomic <span class="badge badge-green">ADJUSTMENT_UP</span> or <span class="badge badge-rose">ADJUSTMENT_DOWN</span> ledger records, synchronizing balances.</li>
    </ol>
  </div>

  <!-- Section 9 -->
  <h1 class="section-title">9.0 Workflow 7: Valuation Reports & Audit Trail</h1>

  <div class="step-card purple">
    <div class="step-header">
      <span>Valuation Intelligence & CSV Export (/reports)</span>
      <span class="badge badge-purple">FINANCE & AUDIT</span>
    </div>
    <ol>
      <li>Navigate to <strong>Reports & Analytics</strong> (<span class="code-pill">/reports</span>).</li>
      <li>Review the total inventory valuation card, calculated dynamically using standard cost across all warehouses.</li>
      <li>Click <strong>Export CSV</strong> to download a formatted spreadsheet report for accounting records.</li>
    </ol>
  </div>

  <div class="step-card slate">
    <div class="step-header">
      <span>Immutable Compliance Audit Trail (/audit)</span>
      <span class="badge badge-slate">AUDITOR</span>
    </div>
    <ol>
      <li>Navigate to <strong>Audit Trail</strong> (<span class="code-pill">/audit</span>).</li>
      <li>Filter by entity (<span class="code-pill">StockMovement</span>, <span class="code-pill">PurchaseOrder</span>, <span class="code-pill">User</span>).</li>
      <li>Click <strong>View Diff</strong> on any row to open the modal showing side-by-side JSON snapshots of the system state before and after the modification.</li>
    </ol>
  </div>

  <!-- Section 10 -->
  <h1 class="section-title">10.0 Theme Customization & Database Inspection</h1>
  <table class="data-table">
    <thead>
      <tr>
        <th>Action</th>
        <th>Procedure & Instructions</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Theme Switcher</strong></td>
        <td>Click the <strong>Sun / Moon</strong> toggle button in the top navbar or login page. Toggles seamlessly between Light Mode (crisp slate contrast) and Dark Mode (executive dark glassmorphism). Preference is saved in browser storage.</td>
      </tr>
      <tr>
        <td><strong>Prisma Studio (Web GUI)</strong></td>
        <td>Open terminal in backend and run: <br><span class="code-pill">node node_modules/prisma/build/index.js studio</span><br>Open browser at <strong>http://localhost:5555</strong> to visually explore all 56 PostgreSQL tables.</td>
      </tr>
      <tr>
        <td><strong>External DB Tool</strong></td>
        <td>Connect DBeaver / pgAdmin to <span class="code-pill">localhost:5434</span> with user <span class="code-pill">erp_user</span>, password <span class="code-pill">erp_password</span>, database <span class="code-pill">enterprise_erp</span>.</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
"""

def generate_tamil_html():
    return f"""<!DOCTYPE html>
<html lang="ta">
<head>
  <meta charset="UTF-8">
  <title>Apex ERP - முழுமையான படிமுறை வழிகாட்டி மற்றும் பணிப்பாய்வு கையேடு</title>
  <style>{COMMON_CSS}</style>
</head>
<body class="tamil-text">
  <!-- Cover Page -->
  <div class="cover">
    <div>
      <div class="brand-badge">APEX ERP நிறுவனம்</div>
      <div class="hero-title">முழுமையான படிமுறை செயல்பாட்டு வழிகாட்டி & பணிப்பாய்வு கையேடு</div>
      <div class="hero-sub">பல-இருப்பிட கிடங்கு கட்டமைப்பு, நேரடி சரக்கு இருப்பு பேரேடு, கொள்முதல் ஒப்புதல் முறைமை & பயனர் அனுமதிகள் மேலாண்மை</div>
    </div>
    
    <div>
      <div class="meta-box">
        <div class="meta-item">
          <strong>பதிப்பு (Version)</strong>
          v1.0.0 நிறுவன கிடங்கு பதிப்பு
        </div>
        <div class="meta-item">
          <strong>பயனர் இடைமுகம் (Frontend)</strong>
          React 18 + Vite (போர்ட் 5173)
        </div>
        <div class="meta-item">
          <strong>பின்னணி சேவை (Backend API)</strong>
          Express + TypeScript + Prisma ORM (போர்ட் 5001)
        </div>
        <div class="meta-item">
          <strong>தரவுத்தளம் (Database)</strong>
          PostgreSQL 15 (போர்ட் 5434)
        </div>
      </div>
    </div>
  </div>
  
  <div class="page-break"></div>
  
  <!-- Table of Contents -->
  <h1 class="section-title">பொருளடக்கம் (Table of Contents)</h1>
  <table class="data-table">
    <thead>
      <tr>
        <th style="width: 15%;">பிரிவு</th>
        <th>செயல்பாட்டு தொகுதி (Module)</th>
        <th style="width: 28%;">பயனர் பங்குகள் (Target Roles)</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>1.0</strong></td>
        <td>கணினி கட்டமைப்பு & 1-கிளிக் டெமோ உள்நுழைவு</td>
        <td>அனைத்து பயனர்கள் (All Users)</td>
      </tr>
      <tr>
        <td><strong>2.0</strong></td>
        <td>பயனர் பங்கு & அனுமதிகள் மேலாண்மை (RBAC Matrix)</td>
        <td>நிர்வாகி (Admin), மேலாளர்கள்</td>
      </tr>
      <tr>
        <td><strong>3.0</strong></td>
        <td>பணிப்பாய்வு 1: கிடங்கு மற்றும் பெட்டக படிநிலை அமைப்பு (/hierarchy)</td>
        <td>கிடங்கு மேலாளர் (Warehouse Mgr)</td>
      </tr>
      <tr>
        <td><strong>4.0</strong></td>
        <td>பணிப்பாய்வு 2: முதன்மை தயாரிப்பு பட்டியல் மேலாண்மை (/products)</td>
        <td>சரக்கு மேலாளர் (Inventory Mgr)</td>
      </tr>
      <tr>
        <td><strong>5.0</strong></td>
        <td>பணிப்பாய்வு 3: கொள்முதல் கோரிக்கை & ஒப்புதல் முறைமை (/procurement)</td>
        <td>துறைத் தலைவர், நிதி ஒப்புதலளிப்பவர்</td>
      </tr>
      <tr>
        <td><strong>6.0</strong></td>
        <td>பணிப்பாய்வு 4: சரக்கு வரவு & கூடை ஒதுக்கீடு பணி (/receiving)</td>
        <td>கிடங்கு பணியாளர் (Warehouse Staff)</td>
      </tr>
      <tr>
        <td><strong>7.0</strong></td>
        <td>பணிப்பாய்வு 5: கிடங்குகளுக்கிடையிலான சரக்கு பரிமாற்றம் (/transfers)</td>
        <td>கிடங்கு ஊழியர்கள், தளவாடங்கள்</td>
      </tr>
      <tr>
        <td><strong>8.0</strong></td>
        <td>பணிப்பாய்வு 6: நேரடி சரக்கு கணக்கெடுப்பு & சரிசெய்தல் (/stock-counts)</td>
        <td>சரக்கு மேலாளர், தணிக்கையாளர்</td>
      </tr>
      <tr>
        <td><strong>9.0</strong></td>
        <td>பணிப்பாய்வு 7: நிதி மதிப்பீட்டு அறிக்கை & மாறாத தணிக்கை பதிவு (/reports & /audit)</td>
        <td>நிதி மேலாளர், உள் தணிக்கையாளர்</td>
      </tr>
      <tr>
        <td><strong>10.0</strong></td>
        <td>தீம் மாற்றுதல் (Dark/Light) & தரவுத்தள பார்வை வழிகாட்டி</td>
        <td>தொழில்நுட்ப வல்லுநர்கள்</td>
      </tr>
    </tbody>
  </table>
  
  <!-- Section 1 -->
  <h1 class="section-title">1.0 கணினி கட்டமைப்பு & 1-கிளிக் உள்நுழைவு முறைகள்</h1>
  <p><strong>Apex Enterprise ERP</strong> என்பது பல கிளைகள் மற்றும் கிடங்குகளைக் கொண்ட நிறுவனங்களுக்கான உயர்தர சரக்கு மேலாண்மை அமைப்பாகும். இதில் ஒவ்வொரு சரக்கு இயக்கமும் இரட்டைப் பதிவு பேரேட்டில் (Double-entry stock ledger) மாறாத பரிவர்த்தனையாகப் பதிவு செய்யப்படுகிறது.</p>
  
  <div class="callout">
    <strong>பொதுவான கடவுச்சொல்:</strong> கணினியில் உள்ள அனைத்து டெமோ பயனர்களுக்கும் ஒரே பொதுவான கடவுச்சொல்: <span class="code-pill">Password123!</span>. மேல்புற நேவிகேஷன் பட்டியில் உள்ள Role பொத்தானை அழுத்தி ஒரே கிளிக்கில் எந்தப் பயனராகவும் மாறலாம்.
  </div>
  
  <table class="data-table">
    <thead>
      <tr>
        <th>பயனர் பெயர்</th>
        <th>பயனர் ஐடி (Username)</th>
        <th>பங்கு (Role)</th>
        <th>முதன்மை பொறுப்புகள்</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>கணினி நிர்வாகி</strong></td>
        <td><span class="code-pill">admin</span></td>
        <td><span class="badge badge-purple">ADMIN</span></td>
        <td>முழு கணினி அதிகாரம், பயனர் மேலாண்மை, பங்கு ஒதுக்கீடு மற்றும் ஒட்டுமொத்த மேற்பார்வை.</td>
      </tr>
      <tr>
        <td><strong>சரக்கு மேலாளர்</strong></td>
        <td><span class="code-pill">inv_manager</span></td>
        <td><span class="badge badge-blue">INVENTORY_MANAGER</span></td>
        <td>தயாரிப்பு பட்டியல், குறைந்த இருப்பு எச்சரிக்கை விதிகள், சரக்கு சரிசெய்தல் ஒப்புதல்.</td>
      </tr>
      <tr>
        <td><strong>கிடங்கு மேலாளர்</strong></td>
        <td><span class="code-pill">wh_manager</span></td>
        <td><span class="badge badge-blue">WAREHOUSE_MANAGER</span></td>
        <td>கிடங்கு மண்டலங்கள், அடுக்குகள், சேமிப்பு பெட்டகங்கள், கிளை பரிமாற்றங்களை அனுப்புதல்.</td>
      </tr>
      <tr>
        <td><strong>கிடங்கு ஊழியர்</strong></td>
        <td><span class="code-pill">wh_staff</span></td>
        <td><span class="badge badge-green">WAREHOUSE_STAFF</span></td>
        <td>சரக்கு இறக்குதல் (GRN), பெட்டகத்தில் சரக்கு அடுக்குதல் (Putaway), பார்கோடு சரிபார்த்தல்.</td>
      </tr>
      <tr>
        <td><strong>கொள்முதல் அதிகாரி</strong></td>
        <td><span class="code-pill">proc_officer</span></td>
        <td><span class="badge badge-amber">PROCUREMENT_OFFICER</span></td>
        <td>விற்பனையாளர் மேலாண்மை, கொள்முதல் ஆணை (PO) உருவாக்குதல், விலைப் பேச்சுவார்த்தை.</td>
      </tr>
      <tr>
        <td><strong>துறைத் தலைவர்</strong></td>
        <td><span class="code-pill">dept_manager</span></td>
        <td><span class="badge badge-purple">DEPARTMENT_MANAGER</span></td>
        <td>துறை சார்ந்த பொருட்களுக்கான கொள்முதல் கோரிக்கைகளை (PR) உருவாக்கி சமர்ப்பித்தல்.</td>
      </tr>
      <tr>
        <td><strong>நிதி ஒப்புதலளிப்பவர்</strong></td>
        <td><span class="code-pill">fin_approver</span></td>
        <td><span class="badge badge-green">FINANCE_APPROVER</span></td>
        <td>பட்ஜெட் சரிபார்ப்பு, நிதி சார்ந்த கொள்முதல்களுக்கு இறுதி ஒப்புதல் அளித்தல்.</td>
      </tr>
      <tr>
        <td><strong>உள் தணிக்கையாளர்</strong></td>
        <td><span class="code-pill">auditor</span></td>
        <td><span class="badge badge-slate">AUDITOR</span></td>
        <td>சரக்கு பேரேடு தணிக்கை, கணக்கு முரண்பாடுகளை ஆய்வு செய்தல், மாற்றங்களை கண்காணித்தல்.</td>
      </tr>
    </tbody>
  </table>

  <div class="page-break"></div>

  <!-- Section 2 -->
  <h1 class="section-title">2.0 பயனர் பங்கு & அனுமதிகள் மேலாண்மை (RBAC)</h1>
  <p>இந்த மென்பொருளில் 25-க்கும் மேற்பட்ட நுணுக்கமான பாதுகாப்பு அனுமதிகள் உள்ளன. கடமைகளைப் பிரித்தல் (Separation of Duties) விதியின்படி, கோரிக்கையை உருவாக்கியவரே அதற்கு ஒப்புதல் அளிக்க முடியாது.</p>

  <div class="step-card purple">
    <div class="step-header">
      <span>பயனர்களை நிர்வகித்தல் & அனுமதி மேட்ரிக்ஸ் பார்வை (/users)</span>
      <span class="badge badge-purple">நிர்வாகி மட்டும் (ADMIN)</span>
    </div>
    <ol>
      <li><span class="code-pill">admin</span> ஆக உள்நுழைந்து பக்கப்பட்டியில் உள்ள <strong>Users & Permissions</strong>-ஐத் தேர்ந்தெடுக்கவும்.</li>
      <li><strong>பயனர் பட்டியல்:</strong> பெயர், மின்னஞ்சல் அல்லது துறை வாரியாகத் தேடலாம். அவர்களின் கிடங்கு அணுகல் நிலையைப் பார்க்கலாம்.</li>
      <li><strong>பயனரை முடக்குதல் / மீண்டும் இயக்குதல்:</strong> தற்காலிகமாக ஒரு ஊழியரின் அணுகலை ரத்து செய்ய <span class="badge badge-rose">Suspend</span> பொத்தானை அழுத்தவும்.</li>
      <li><strong>பங்கு ஒதுக்கீடு:</strong> <span class="badge badge-blue">+ Role</span> பொத்தானை அழுத்தி கூடுதல் பொறுப்புகளை வழங்கலாம் அல்லது நீக்கலாம்.</li>
      <li><strong>அனுமதி மேட்ரிக்ஸ் (Matrix Tab):</strong> 8 பங்குகளுக்கும் உள்ள 25+ அனுமதிகளை சரிபார்க்கலாம்.</li>
    </ol>
  </div>

  <!-- Section 3 -->
  <h1 class="section-title">3.0 பணிப்பாய்வு 1: கிடங்கு மற்றும் பெட்டக படிநிலை அமைப்பு</h1>
  <p>கிடங்கு சேமிப்பு இடங்கள் 8 நிலைகளாக கட்டமைக்கப்பட்டுள்ளன: <strong>நிறுவனம் &rarr; பிராந்தியம் &rarr; நகரம் &rarr; வளாகம் &rarr; கிடங்கு &rarr; மண்டலம் &rarr; அடுக்கு &rarr; பெட்டகம் (Bin)</strong>.</p>
  
  <div class="flow-diagram">
    <div class="flow-step">Apex Corp<br><span style="font-size:8pt;color:#64748b;">நிறுவனம்</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">மத்திய பிராந்தியம்<br><span style="font-size:8pt;color:#64748b;">பிராந்தியம்</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">முதன்மை கிடங்கு<br><span style="font-size:8pt;color:#64748b;">கிடங்கு</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">மண்டலம் A<br><span style="font-size:8pt;color:#64748b;">Zone</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">அடுக்கு R01<br><span style="font-size:8pt;color:#64748b;">Rack</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">பெட்டகம் A-01-01<br><span style="font-size:8pt;color:#64748b;">Bin</span></div>
  </div>

  <div class="step-card blue">
    <div class="step-header">
      <span>கிடங்கு மர அமைப்பை பார்வையிடுதல் மற்றும் புதிய கூடை சேர்த்தல்</span>
      <span class="badge badge-blue">கிடங்கு மேலாளர்</span>
    </div>
    <ol>
      <li>பக்கப்பட்டியில் <strong>Warehouse Tree</strong> (<span class="code-pill">/hierarchy</span>) பக்கத்திற்குச் செல்லவும்.</li>
      <li>நிறுவனம் மற்றும் நகரங்களை விரிவுபடுத்தி கிடங்குகளைப் பார்க்கலாம்.</li>
      <li>மரத்தில் உள்ள எந்தவொரு <strong>Bin குறியீட்டையும்</strong> (எ.கா. <span class="code-pill">BIN-A-01-01</span>) கிளிக் செய்தால், வலதுபுற பலகையில்:
        <ul>
          <li>கூடையின் வகை (வழக்கமான சேமிப்பு, குளிர்சாதன சேமிப்பு அல்லது தற்காலிக சேமிப்பு).</li>
          <li>அக்கூடையினுள் தற்போது வைக்கப்பட்டுள்ள பொருட்கள், பேட்ச் எண்கள் மற்றும் அளவுகள் உடனடியாகத் தெரியும்.</li>
        </ul>
      </li>
      <li>புதிய சேமிப்பு இடத்தை உருவாக்க <strong>Add Bin</strong> பொத்தானைப் பயன்படுத்தவும்.</li>
    </ol>
  </div>

  <div class="page-break"></div>

  <!-- Section 4 -->
  <h1 class="section-title">4.0 பணிப்பாய்வு 2: தயாரிப்பு பட்டியல் மேலாண்மை</h1>
  <p>ஒழுங்கமைக்கப்பட்ட தயாரிப்பு அட்டவணை சரக்கு இருப்பை துல்லியமாக கண்காணிக்க உதவுகிறது.</p>

  <div class="step-card green">
    <div class="step-header">
      <span>புதிய தயாரிப்பை சேர்த்தல் மற்றும் வரம்புகளை நிர்ணயித்தல் (/products)</span>
      <span class="badge badge-green">சரக்கு மேலாளர்</span>
    </div>
    <ol>
      <li>பக்கப்பட்டியில் <strong>Product Master</strong> (<span class="code-pill">/products</span>) பக்கத்தைத் திறக்கவும்.</li>
      <li><strong>+ New Product</strong> பொத்தானை அழுத்தவும்.</li>
      <li>தேவையான விவரங்களை உள்ளிடவும்:
        <ul>
          <li><strong>SKU குறியீடு:</strong> தயாரிப்பின் பிரத்யேக எண் (எ.கா. <span class="code-pill">SKU-BRG-200</span>).</li>
          <li><strong>தயாரிப்பு பெயர்:</strong> பொருளின் முழு பெயர் (எ.கா. Precision Ball Bearing 12mm).</li>
          <li><strong>பிரிவு & அளவீட்டு அலகு:</strong> பிரிவு (Electronics, Mechanical) மற்றும் அலகு (Pieces, Kg).</li>
          <li><strong>இருப்பு வரம்புகள்:</strong> குறைந்தபட்ச இருப்பு (<span class="code-pill">Min Stock: 10</span>), அதிகபட்ச இருப்பு (<span class="code-pill">Max Stock: 500</span>) மற்றும் மறு-ஆணை வரம்பு (<span class="code-pill">Reorder Level: 25</span>).</li>
          <li><strong>விலை விவரங்கள்:</strong> அடக்க விலை (Cost Price $) மற்றும் விற்பனை விலை (Selling Price $).</li>
        </ul>
      </li>
      <li>சேமித்ததும் இருப்பு நிலைக்கு ஏற்ப <span class="badge badge-green">NORMAL</span> அல்லது <span class="badge badge-amber">LOW STOCK</span> பேட்ஜ்கள் தானாக தோன்றும்.</li>
    </ol>
  </div>

  <!-- Section 5 -->
  <h1 class="section-title">5.0 பணிப்பாய்வு 3: கொள்முதல் & ஒப்புதல் சுழற்சி</h1>
  <p>நிறுவனத்தின் கொள்முதல் செயல்முறை மூன்று கட்டங்களாக நடக்கிறது: <strong>கோரிக்கை &rarr; பல அடுக்கு ஒப்புதல் &rarr; கொள்முதல் ஆணை</strong>.</p>

  <div class="flow-diagram">
    <div class="flow-step">1. கோரிக்கை (PR)<br><span style="font-size:8pt;color:#64748b;">துறைத் தலைவர்</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">2. சமர்ப்பித்தல்<br><span style="font-size:8pt;color:#64748b;">பணிப்பாய்வு இயந்திரம்</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">3. ஒப்புதல் பெட்டி<br><span style="font-size:8pt;color:#64748b;">துறை & நிதி ஒப்புதல்</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">4. ஆணை (PO)<br><span style="font-size:8pt;color:#64748b;">கொள்முதல் அதிகாரி</span></div>
  </div>

  <div class="step-card purple">
    <div class="step-header">
      <span>படி 1: கொள்முதல் கோரிக்கையை உருவாக்குதல் (/procurement)</span>
      <span class="badge badge-purple">துறைத் தலைவர் (DEPARTMENT_MANAGER)</span>
    </div>
    <ol>
      <li><span class="code-pill">dept_manager</span> ஆக உள்நுழைந்து <strong>Procurement & PO</strong> பக்கத்திற்குச் செல்லவும்.</li>
      <li><strong>New Requisition</strong> பொத்தானை அழுத்தி துறை, தயாரிப்பு, தேவையான அளவு மற்றும் காரணத்தை உள்ளிடவும்.</li>
      <li>வரைவு வரிசையில் உள்ள <strong>Submit Approval</strong> பொத்தானை அழுத்தவும். இது ஆவணத்தை <span class="badge badge-amber">SUBMITTED</span> நிலைக்கு மாற்றி ஒப்புதல் வரிசையில் சேர்க்கும்.</li>
    </ol>
  </div>

  <div class="step-card green">
    <div class="step-header">
      <span>படி 2: ஒப்புதல் பெட்டியில் ஆய்வு செய்து ஒப்புதல் அளித்தல் (/approvals)</span>
      <span class="badge badge-green">நிதி ஒப்புதலளிப்பவர் (FINANCE_APPROVER)</span>
    </div>
    <ol>
      <li><span class="code-pill">fin_approver</span> ஆக மாறவும். மேல்புற நேவிகேஷனில் உள்ள எச்சரிக்கை பேட்ஜில் நிலுவை எண்ணிக்கை காட்டும்.</li>
      <li><strong>Approval Inbox</strong> (<span class="code-pill">/approvals</span>) பக்கத்திற்குச் செல்லவும்.</li>
      <li>கோரிக்கையின் பட்ஜெட், தேவையான அளவு மற்றும் காரணங்களை ஆய்வு செய்யவும்.</li>
      <li>மூன்று செயல்களில் ஒன்றைத் தேர்ந்தெடுக்கலாம்:
        <ul>
          <li><strong>Approve Step:</strong> கோரிக்கைக்கு இறுதி ஒப்புதல் அளிக்கிறது. நிலை <span class="badge badge-green">APPROVED</span> ஆக மாறும்.</li>
          <li><strong>Return for Edit:</strong> கோரிக்கையாளருக்கு திருத்தங்களுக்காக திருப்பி அனுப்பும்.</li>
          <li><strong>Reject:</strong> நிராகரிப்பதற்கான காரணத்துடன் நிராகரிக்கும்.</li>
        </ul>
      </li>
    </ol>
  </div>

  <div class="step-card amber">
    <div class="step-header">
      <span>படி 3: விற்பனையாளர் கொள்முதல் ஆணை (PO) உருவாக்குதல்</span>
      <span class="badge badge-amber">கொள்முதல் அதிகாரி (PROCUREMENT_OFFICER)</span>
    </div>
    <ol>
      <li><span class="code-pill">proc_officer</span> ஆக மாறவும்.</li>
      <li><strong>Create Purchase Order</strong> பொத்தானை அழுத்தி விற்பனையாளர், தயாரிப்பு, ஒப்பந்த விலை மற்றும் விதிமுறைகளை உள்ளிடவும்.</li>
      <li>சேமித்ததும் ஆணை எண் (எ.கா. <span class="code-pill">PO-2026-001</span>) உருவாகி <span class="badge badge-blue">ORDERED</span> நிலையை அடையும்.</li>
    </ol>
  </div>

  <div class="page-break"></div>

  <!-- Section 6 -->
  <h1 class="section-title">6.0 பணிப்பாய்வு 4: சரக்கு வரவு & பெட்டகத்தில் அடுக்குதல்</h1>
  <p>சரக்கு இறங்குதளத்தில் வந்து இறங்கியதும் உடனடியாக விற்பனை இருப்புக்கு செல்லாது; தரக் கட்டுப்பாடு முடிந்து குறிப்பிட்ட பெட்டகத்தில் வைக்கப்பட்ட பின்னரே பேரேட்டில் பதியப்படும்.</p>

  <div class="step-card blue">
    <div class="step-header">
      <span>சரக்கு வரவு (GRN) & பெட்டக ஒதுக்கீடு பணி (/receiving)</span>
      <span class="badge badge-blue">கிடங்கு பணியாளர் (WAREHOUSE_STAFF)</span>
    </div>
    <ol>
      <li><span class="code-pill">wh_staff</span> ஆக உள்நுழைந்து <strong>Receiving & Putaway</strong> பக்கத்தைத் திறக்கவும்.</li>
      <li><strong>சரக்கு வரவு ஆவணம் (GRN):</strong> லாரி வந்ததும் <strong>Generate GRN</strong> பொத்தானை அழுத்தவும்.
        <ul>
          <li>விற்பனையாளர், பெறும் கிடங்கு, தயாரிப்பு மற்றும் கொண்டுவரப்பட்ட அளவை உள்ளிடவும்.</li>
          <li>ஆய்வு முடிவுகள்: ஏற்கப்பட்ட அளவு (<span class="code-pill">Accepted: 95</span>) மற்றும் சேதமடைந்த அளவு (<span class="code-pill">Damaged: 5</span>).</li>
          <li>விற்பனையாளரின் பேட்ச்/லாட் எண்ணைப் பதிவு செய்யவும்.</li>
        </ul>
      </li>
      <li><strong>தானியங்கி பெட்டகப் பணி:</strong> கணினி ஏற்கப்பட்ட பொருட்களுக்கு பொருத்தமான பெட்டகத்தை ஒதுக்கி ஒரு பணிக் குறிப்பை உருவாக்கும்.</li>
      <li><strong>கூடையில் வைத்தலை உறுதி செய்தல்:</strong> <em>Pending Putaway Tasks</em> பகுதியில் ஒதுக்கப்பட்ட பெட்டக குறியீட்டைப் பார்த்து (எ.கா. <span class="code-pill">BIN-A-01-02</span>), <strong>Confirm Putaway to Bin</strong> பொத்தானை அழுத்தவும்.</li>
      <li><strong>பேரேட்டில் பதிவு:</strong> கணினி தானாகவே <span class="badge badge-green">RECEIPT</span> பரிவர்த்தனையை பேரேட்டில் எழுதி இருப்பை அதிகரிக்கும்.</li>
    </ol>
  </div>

  <!-- Section 7 -->
  <h1 class="section-title">7.0 பணிப்பாய்வு 5: கிடங்குகளுக்கிடையிலான சரக்கு பரிமாற்றம்</h1>
  <p>ஒரு கிடங்கிலிருந்து மற்றொரு கிடங்கிற்கு சரக்குகளை அனுப்பும்போது வழித்தட இருப்பு (In-Transit Buffer) மூலம் இழப்பு இல்லாமல் கண்காணிக்கப்படுகிறது.</p>

  <div class="flow-diagram">
    <div class="flow-step">1. பரிமாற்ற கோரிக்கை<br><span style="font-size:8pt;color:#64748b;">மூல கிடங்கு</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">2. லாரி அனுப்புதல்<br><span style="font-size:8pt;color:#64748b;">இருப்பு &rarr; வழித்தடம்</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">3. வழித்தட பேரேடு<br><span style="font-size:8pt;color:#64748b;">ட்ராக்கிங் எண்</span></div>
    <div class="flow-arrow">&rarr;</div>
    <div class="flow-step">4. சேருமிடத்தில் வரவு<br><span style="font-size:8pt;color:#64748b;">கூடையில் வைத்தல்</span></div>
  </div>

  <div class="step-card amber">
    <div class="step-header">
      <span>சரக்கு பரிமாற்றத்தை செயல்படுத்துதல் (/transfers)</span>
      <span class="badge badge-amber">கிடங்கு மேலாளர் & பணியாளர்கள்</span>
    </div>
    <ol>
      <li><strong>Stock Transfers</strong> (<span class="code-pill">/transfers</span>) பக்கத்தைத் திறக்கவும்.</li>
      <li><strong>Initiate Transfer</strong> பொத்தானை அழுத்தி மூல கிடங்கு, இலக்கு கிடங்கு, தயாரிப்பு மற்றும் அளவை உள்ளிடவும்.</li>
      <li><strong>அனுப்புதல் (Dispatch):</strong> வண்டி கிளம்பும்போது <strong>Dispatch Stock</strong> பொத்தானை அழுத்தி லாரி எண் மற்றும் டிராக்கிங் குறியீட்டை உள்ளிடவும். மூல கிடங்கு இருப்பு கழிக்கப்பட்டு <span class="badge badge-blue">IN_TRANSIT</span> நிலைக்கு மாறும்.</li>
      <li><strong>சேருமிடத்தில் பெறுதல் (Receive):</strong> சரக்கு சேருமிட கிடங்கை அடைந்ததும், அங்குள்ள ஊழியர் <strong>Receive Goods</strong> பொத்தானை அழுத்தி இலக்கு கூடையைத் தேர்ந்தெடுத்து எண்ணிக்கையை உறுதி செய்வார்.</li>
      <li><strong>முரண்பாடு அறிக்கை:</strong> அனுப்பப்பட்ட அளவை விட குறைவாக வந்தால் கணினி முரண்பாட்டு அறிக்கையை (Discrepancy Shortage) உருவாக்கும்.</li>
    </ol>
  </div>

  <div class="page-break"></div>

  <!-- Section 8 -->
  <h1 class="section-title">8.0 பணிப்பாய்வு 6: நேரடி சரக்கு கணக்கெடுப்பு & சரிசெய்தல்</h1>
  <p>வழக்கமான கிடங்கு செயல்பாடுகளை நிறுத்தாமல் அவ்வப்போது சரக்குகளை எண்ணி கணினி இருப்புடன் ஒப்பிட்டு சரிசெய்யலாம்.</p>

  <div class="step-card teal">
    <div class="step-header">
      <span>சுழற்சி கணக்கெடுப்பு மற்றும் முரண்பாடுகளை சரிசெய்தல் (/stock-counts)</span>
      <span class="badge badge-teal">சரக்கு மேலாளர் & பணியாளர்கள்</span>
    </div>
    <ol>
      <li><strong>Counts & Variance</strong> (<span class="code-pill">/stock-counts</span>) பக்கத்திற்குச் செல்லவும்.</li>
      <li><strong>New Cycle Count</strong> பொத்தானை அழுத்தி கிடங்கு மற்றும் கணக்கெடுப்பு முறையைத் தேர்ந்தெடுக்கவும்.</li>
      <li>கணினி தற்போதைய இருப்பு நிலையை ஒரு நிலையான நகலாக (Snapshot) சேமிக்கும்.</li>
      <li><strong>நேரடி எண்ணிக்கையை பதிவு செய்தல்:</strong> ஊழியர்கள் அலமாரிகளில் உள்ள பொருட்களை எண்ணி உள்ளிடுவர். வேறுபாடு இருந்தால் காரணத்தைக் குறிப்பிடலாம் (<span class="code-pill">கூடுதல்</span>, <span class="code-pill">இழப்பு</span>, <span class="code-pill">சேதம்</span>).</li>
      <li><strong>சரிசெய்தல் (Post Adjustments):</strong> சரக்கு மேலாளர் வேறுபாடுகளை சரிபார்த்து <strong>Post Adjustments</strong> பொத்தானை அழுத்தினால், கணினி பேரேட்டில் <span class="badge badge-green">ADJUSTMENT_UP</span> அல்லது <span class="badge badge-rose">ADJUSTMENT_DOWN</span> பதிவுகளை எழுதி இருப்பை சரிசெய்யும்.</li>
    </ol>
  </div>

  <!-- Section 9 -->
  <h1 class="section-title">9.0 பணிப்பாய்வு 7: நிதி மதிப்பீடு & தணிக்கைப் பதிவு</h1>

  <div class="step-card purple">
    <div class="step-header">
      <span>சரக்கு சொத்து மதிப்பீடு மற்றும் CSV அறிக்கை பதிவிறக்கம் (/reports)</span>
      <span class="badge badge-purple">நிதி & தணிக்கை</span>
    </div>
    <ol>
      <li><strong>Reports & Analytics</strong> (<span class="code-pill">/reports</span>) பக்கத்திற்குச் செல்லவும்.</li>
      <li>அனைத்து கிடங்குகளிலும் உள்ள மொத்த சரக்குகளின் தற்போதைய சந்தை மற்றும் உற்பத்தி மதிப்பீட்டு அட்டவணையை பார்வையிடவும்.</li>
      <li><strong>Export CSV</strong> பொத்தானை அழுத்தி விரிதாள் (Spreadsheet) கோப்பாக பதிவிறக்கம் செய்யலாம்.</li>
    </ol>
  </div>

  <div class="step-card slate">
    <div class="step-header">
      <span>மாறாத தணிக்கைப் பதிவு (Audit Trail - /audit)</span>
      <span class="badge badge-slate">உள் தணிக்கையாளர்</span>
    </div>
    <ol>
      <li><strong>Audit Trail</strong> (<span class="code-pill">/audit</span>) பக்கத்தைத் திறக்கவும்.</li>
      <li>தொகுதி வாரியாக வடிகட்டலாம் (<span class="code-pill">StockMovement</span>, <span class="code-pill">PurchaseOrder</span>, <span class="code-pill">User</span>).</li>
      <li>எந்தவொரு வரியிலும் <strong>View Diff</strong> பொத்தானை அழுத்தினால், அந்த மாற்றத்திற்கு முந்தைய மற்றும் பிந்தைய முழுமையான JSON தரவு வேறுபாட்டை ஒப்பிட்டுப் பார்க்கலாம்.</li>
    </ol>
  </div>

  <!-- Section 10 -->
  <h1 class="section-title">10.0 தீம் மாற்றுதல் மற்றும் தரவுத்தள பார்வை வழிகாட்டி</h1>
  <table class="data-table">
    <thead>
      <tr>
        <th>செயல்பாடு</th>
        <th>வழிமுறைகள்</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>தீம் மாற்றுதல் (Dark / Light)</strong></td>
        <td>மேல்புற நேவிகேஷன் பட்டியில் உள்ள <strong>சூரியன் / சந்திரன்</strong> பொத்தானை அழுத்தவும். உடனடியாக பகல் நேர வெளிச்ச முறை (Light Mode) அல்லது இரவு நேர கருமை முறைக்கு (Dark Mode) மாறும்.</td>
      </tr>
      <tr>
        <td><strong>Prisma Studio (வலை இடைமுகம்)</strong></td>
        <td>பின்புல முனையத்தில் (Backend terminal) பின்வரும் கட்டளையை இயக்கவும்: <br><span class="code-pill">node node_modules/prisma/build/index.js studio</span><br>உலாவியில் <strong>http://localhost:5555</strong> முகவரியில் அனைத்து 56 அட்டவணைகளையும் நேரடியாகக் காணலாம்.</td>
      </tr>
      <tr>
        <td><strong>வெளிப்புற தரவுத்தள இணைப்பிகள்</strong></td>
        <td>DBeaver அல்லது pgAdmin மென்பொருளில் <span class="code-pill">localhost:5434</span>, பயனர்: <span class="code-pill">erp_user</span>, கடவுச்சொல்: <span class="code-pill">erp_password</span>, தரவுத்தளம்: <span class="code-pill">enterprise_erp</span> என இணைக்கலாம்.</td>
      </tr>
    </tbody>
  </table>
</body>
</html>
"""

def generate_combined_html():
    en_body = generate_english_html().split("<body>")[1].split("</body>")[0]
    ta_body = generate_tamil_html().split("<body class=\"tamil-text\">")[1].split("</body>")[0]
    
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Apex ERP - Dual Language Master Workflow & User Guide</title>
  <style>{COMMON_CSS}</style>
</head>
<body>
  <!-- English Master Section -->
  <div style="border-bottom: 4px solid #0284c7; padding-bottom: 8px; margin-bottom: 24px;">
    <span class="badge badge-blue" style="font-size: 11pt;">PART 1 / பகுதி 1</span>
    <span style="font-size: 14pt; font-weight: 800; margin-left: 10px; color: #0284c7;">ENGLISH OPERATIONS GUIDE</span>
  </div>
  {en_body}

  <div class="page-break"></div>

  <!-- Tamil Master Section -->
  <div style="border-bottom: 4px solid #9333ea; padding-bottom: 8px; margin-bottom: 24px; margin-top: 30px;">
    <span class="badge badge-purple" style="font-size: 11pt;">PART 2 / பகுதி 2</span>
    <span style="font-size: 14pt; font-weight: 800; margin-left: 10px; color: #9333ea;">தமிழ் செயல்பாட்டு வழிகாட்டி (TAMIL GUIDE)</span>
  </div>
  <div class="tamil-text">
    {ta_body}
  </div>
</body>
</html>
"""

def render_html_to_pdf(html_path, pdf_path):
    print(f"Rendering: {os.path.basename(html_path)} -> {os.path.basename(pdf_path)}")
    cmd = [
        EDGE_PATH,
        "--headless=new",
        "--disable-gpu",
        "--allow-file-access-from-files",
        "--run-all-compositor-stages-before-draw",
        f"--print-to-pdf={pdf_path}",
        html_path
    ]
    res = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(pdf_path):
        size_kb = os.path.getsize(pdf_path) / 1024
        print(f"  [SUCCESS] Created {pdf_path} ({size_kb:.1f} KB)")
    else:
        print(f"  [ERROR] Failed to create {pdf_path}: {res.stderr}")

def main():
    os.makedirs(NOTES_DIR, exist_ok=True)
    
    # 1. English HTML & PDF
    en_html_path = os.path.join(NOTES_DIR, "workflow_english.html")
    en_pdf_path = os.path.join(NOTES_DIR, "workflow_english.pdf")
    with open(en_html_path, "w", encoding="utf-8") as f:
        f.write(generate_english_html())
    render_html_to_pdf(en_html_path, en_pdf_path)
    
    # 2. Tamil HTML & PDF
    ta_html_path = os.path.join(NOTES_DIR, "workflow_tamil.html")
    ta_pdf_path = os.path.join(NOTES_DIR, "workflow_tamil.pdf")
    with open(ta_html_path, "w", encoding="utf-8") as f:
        f.write(generate_tamil_html())
    render_html_to_pdf(ta_html_path, ta_pdf_path)
    
    # 3. Combined Bilingual workflow.pdf (as requested in notes/workflow.pdf)
    comb_html_path = os.path.join(NOTES_DIR, "workflow_combined.html")
    comb_pdf_path = os.path.join(NOTES_DIR, "workflow.pdf")
    with open(comb_html_path, "w", encoding="utf-8") as f:
        f.write(generate_combined_html())
    render_html_to_pdf(comb_html_path, comb_pdf_path)
    
    print("\nAll User Guide PDFs successfully compiled and rendered!")

if __name__ == "__main__":
    main()
