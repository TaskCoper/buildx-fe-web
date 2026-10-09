/**
 * Bản TIẾNG ANH của năm trang pháp lý ở chân trang — dịch từ `legal-docs.ts` (tiếng Việt),
 * giữ nguyên cấu trúc, màu chữ, đậm/nghiêng, cỡ chữ và khung ghi chú của file docs gốc.
 * Bản dịch tham khảo; bản tiếng Việt là bản có giá trị pháp lý. Các ô `[...]` là chỗ Bên A chưa điền.
 */
import type { LegalDoc, LegalDocKey } from './legal-docs'
import { LEGAL_PARTNERS_EN } from './legal-partners.en'

export const LEGAL_DOCS_EN: Record<LegalDocKey, LegalDoc> = {
  terms: {
    base: { c: '334155', z: 21 },
    blocks: [
      { k: 'p', a: 'c', r: [{ t: 'BUILD X PLATFORM TERMS OF USE', b: true, c: '15803d', z: 36 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X is a platform that connects and comprehensively provides solutions for design, cost estimation, construction, supervision, legal matters, materials - interior and exterior furnishings, finance and real estate management.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Operating entity information', b: true, c: '15803d', z: 25 }] },
      { k: 'p', a: 'j', r: [{ t: 'Detailed information about the owner and operator of the Build X system:' }] },
      { k: 'li', a: 'j', r: [{ t: 'Legal entity name: ', b: true }, { t: '[UPDATING]' }] },
      { k: 'li', a: 'j', r: [{ t: 'Tax code / Enterprise code: ', b: true }, { t: '[UPDATING]' }] },
      { k: 'li', a: 'j', r: [{ t: 'Head office: ', b: true }, { t: '[UPDATING]' }] },
      { k: 'li', a: 'j', r: [{ t: 'Hotline: ', b: true }, { t: '[UPDATING]' }] },
      { k: 'li', a: 'j', r: [{ t: 'Email: ', b: true }, { t: '[UPDATING]' }] },
      { k: 'li', a: 'j', r: [{ t: 'Website: ', b: true }, { t: '[UPDATING]' }] },
      { k: 'h2', r: [{ t: 'Article 1. Definitions', b: true, c: '15803d', z: 25 }] },
      {
        k: 'li',
        a: 'j',
        r: [
          { t: 'Build X / Platform: ', b: true, c: '15803d' },
          {
            t: 'The brand, mobile applications (iOS/Android), website and technology solutions managed by the entity operating Build X.'
          }
        ]
      },
      {
        k: 'li',
        a: 'j',
        r: [
          { t: 'User / Customer: ', b: true, c: '15803d' },
          { t: 'An individual or organisation that accesses, registers an account or uses services on Build X.' }
        ]
      },
      {
        k: 'li',
        a: 'j',
        r: [
          { t: 'Partner: ', b: true, c: '15803d' },
          {
            t: 'Contractors, architects, engineers, material suppliers, legal experts, financial institutions and real estate units participating in the ecosystem.'
          }
        ]
      },
      {
        k: 'li',
        a: 'j',
        r: [
          { t: 'Direct Service: ', b: true, c: '15803d' },
          { t: 'A service that Build X directly commits to deliver and is legally responsible for.' }
        ]
      },
      {
        k: 'li',
        a: 'j',
        r: [
          { t: 'Connected Service: ', b: true, c: '15803d' },
          {
            t: 'A service for which Build X acts as a technology intermediary connecting the Customer with an independent Partner.'
          }
        ]
      },
      {
        k: 'li',
        a: 'j',
        r: [
          { t: 'Working day: ', b: true, c: '15803d' },
          { t: 'Monday to Friday, excluding Saturdays, Sundays and public holidays under Vietnamese law.' }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 2. Intended users', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X is for all individuals and organisations that need to research and use solutions in housing, construction, interiors, legal matters, finance and real estate.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Public content can be freely accessed. For transactions that incur costs or binding contracts, users must have full civil legal capacity or act through a lawful representative.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 3. Transparent service classification', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Build X transparently displays the service group before a transaction is confirmed:' }]
      },
      { k: 'li', a: 'j', r: [{ t: 'Services that Build X is responsible for providing directly; or' }] },
      { k: 'li', a: 'j', r: [{ t: 'Services for which Build X acts as a connecting intermediary.' }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "The information displayed in the interface, quotation or contract is the legal basis for determining Build X's respective role and responsibility."
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 4. Services provided directly by Build X', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Scope: ', b: true, c: '15803d' },
          {
            t: 'Drawing design, cost take-off, turnkey construction/renovation, independent supervision, 1:1 consultation with architects and other designated services.'
          }
        ]
      },
      { k: 'p', a: 'j', r: [{ t: "Build X's responsibilities:", b: true, c: '15803d' }] },
      {
        k: 'li',
        a: 'j',
        r: [{ t: 'Organise, manage and assure service quality in line with contractual commitments.' }]
      },
      {
        k: 'li',
        a: 'j',
        r: [{ t: 'Entitled to mobilise internal staff or sufficiently capable subcontractors for each work item.' }]
      },
      {
        k: 'li',
        a: 'j',
        r: [{ t: "Cooperation with third parties does not reduce Build X's direct responsibility to the customer." }]
      },
      { k: 'h2', r: [{ t: 'Article 5. Professional services and legal standards', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Work that requires a practising certificate or operating licence (structural appraisal, surveying, construction permit applications) must be performed or approved by an individual/organisation with the proper legal capacity.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Legal note: ', b: true, c: '15803d' },
          {
            t: 'Build X is not a law practice organisation. Conditional legal consulting services will be performed by lawyers or law practice organisations that meet the requirements, under a separate contract with the customer.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 6. Turnkey construction', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X is responsible for progress, quality, occupational safety and the obligations committed to in the turnkey construction contract.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Details on material types, unit prices, payment plan, advances, variations, acceptance and warranty are specified separately in the Construction Contract of each project.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 7. Connected services', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Scope: ', b: true, c: '15803d' },
          { t: 'Connecting customers with local contractors, material suppliers, interior units and credit solutions.' }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Operation: ', b: true, c: '15803d' },
          {
            t: 'Providing digital tools to support looking up capability profiles, reconciling quotations, exchanging information and tracking progress.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Binding terms: ', b: true, c: '15803d' },
          {
            t: 'The service contract and payment obligations are established directly between the Customer and the Partner. Build X acts in a supporting role for connection, coordination and intermediary mediation.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 8. Partner verification and management', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "Build X verifies partners' legal information, licences, practising certificates and capability profiles before allowing them to operate on the platform."
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "Identity verification is a reference criterion of capability and does not constitute an unconditional guarantee by Build X for every act or incident on the partner's side."
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 9. User account management', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Users are responsible for providing accurate information and for securing their accounts, passwords and OTP codes.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X applies account authentication and protection methods appropriate to the level of risk (OTP, login session management).'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'If an account is suspected of being compromised, users should contact customer care immediately to have the account temporarily locked.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 10. Establishing electronic transactions', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'The platform fully displays service information, costs, payment methods and the cancellation/refund policy before the customer confirms a transaction.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'A transaction is established only when the Customer actively confirms (taps the confirm or pay button). The Customer can look up and download electronic documents/contracts after completion.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X keeps transaction logs for reconciliation, complaint resolution and proof of transactions as required.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 11. Artificial intelligence (Build X AI)', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'AI functions: ', b: true, c: '15803d' },
          {
            t: 'Supports design idea suggestions, spatial analysis, 3D simulated visualisation, quantity take-off and preliminary cost estimates.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X displays identification labels for features or content generated by AI. AI risk management and data processing comply with the law and the Privacy Policy.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 12. Right to use AI-generated results', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Users may use AI-generated results for lawful purposes, while respecting the intellectual property and privacy rights of the parties concerned.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "The right to use AI results does not include a transfer of intellectual property rights in Build X's source code, algorithms or technology."
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Due to the nature of generative AI, outputs are not guaranteed to be unique or to carry separate copyright.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 13. Professional advisory on AI results', b: true, c: '15803d', z: 25 }] },
      {
        k: 'note',
        fill: 'fef2f2',
        sides: { left: ['b91c1c', 4.7] },
        ps: [
          {
            k: 'p',
            a: 'j',
            r: [
              { t: 'Warning: ', b: true, c: 'b91c1c' },
              {
                t: 'AI results are for initial reference only and do not replace construction drawings, permit applications or the professional appraisal of an architect/engineer holding a practising certificate.',
                c: '7f1d1d'
              }
            ]
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Users should have AI results checked by experts before applying them in practice. Build X disclaims liability for damage arising from ignoring this advisory, except as provided by law.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 14. Ownership of uploaded content', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Users retain full ownership of images, drawings and documents they upload to the system.' }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'When uploading content, users grant Build X a non-exclusive licence to store, technically process and display it to serve the requested functions. Users undertake that they have sufficient lawful rights to the uploaded content.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 15. Personal data & user identification', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "Personal data is collected and processed strictly in accordance with Build X's Privacy Policy and the law."
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X does not require uploading citizen ID/identity documents in the standard process. Users should redact unnecessary identifying information on real estate documents before sharing.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 16. Pricing and payment', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Direct Services: ', b: true, c: '15803d' },
          { t: 'Pay Build X directly through the integrated payment gateway.' }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Connected Services: ', b: true, c: '15803d' },
          { t: "Pay the Partner directly according to the contract's progress milestones." }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'For application versions distributed through the Apple App Store:', b: true, c: '15803d' }]
      },
      {
        k: 'li',
        a: 'j',
        r: [
          { t: 'In-App payment (Apple): ', b: true, c: '15803d' },
          {
            t: "Applies to purchasing AI turns or digital features in the iOS app under Apple's rules. Purchased credits do not expire."
          }
        ]
      },
      {
        k: 'li',
        a: 'j',
        r: [
          { t: 'Physical services: ', b: true, c: '15803d' },
          {
            t: 'For surveying, construction, supervision, materials, etc., payment is made through channels outside In-App as officially instructed.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 17. Connecting financial & credit solutions', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X connects information between customers who need a home-building loan and reputable banks and financial institutions.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X is not a credit institution, does not approve applications or set interest rates. The credit relationship is agreed directly between the customer and the bank.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X makes no commitment on approval or loan limit. Repayment obligations and credit risk follow the credit contract between the two parties.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 18. Real estate services (Build X Property)', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Real estate management, brokerage or transaction features are governed by separate Build X Property Terms and are deployed when the legal conditions are met.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 19. Platform intellectual property', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'The brand, software, interface, processes and intellectual property are owned by Build X. Unauthorised copying, data scraping or reverse engineering is prohibited.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 20. Prohibited acts', b: true, c: '15803d', z: 25 }] },
      { k: 'p', a: 'j', r: [{ t: 'Prohibited acts include:', b: true, c: '15803d' }] },
      { k: 'li', a: 'j', r: [{ t: 'Impersonation and financial fraud.' }] },
      { k: 'li', a: 'j', r: [{ t: 'Spreading malicious code or affecting the safety of the Build X system.' }] },
      { k: 'li', a: 'j', r: [{ t: 'Unauthorised exploitation of personal data or confidential quotations.' }] },
      { k: 'li', a: 'j', r: [{ t: 'Posting content that violates the law, public morals or copyright.' }] },
      { k: 'h3', r: [{ t: 'Notice & Takedown mechanism', b: true, c: '166534', z: 22 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "Rights holders may send a request to remove copyright-infringing content through Build X's customer care channel, with valid supporting evidence."
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Upon a valid notice, Build X will temporarily hide/remove the content for review. The uploader has the right to respond and explain; the content will be restored if the complaint lacks sufficient grounds.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 21. Account deletion and service termination', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Users can request account deletion directly in the app. The system will warn in detail of the consequences before the user confirms.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'After confirmation, personal data will be deleted or anonymised, except for documents/transaction data that must be retained by law.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X has the right to lock an account upon detecting a serious violation and will notify the user of the reason and the appropriate complaint mechanism.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 22. Receiving complaints and mediation support', b: true, c: '15803d', z: 25 }] },
      { k: 'p', a: 'j', r: [{ t: 'Customers can send feedback/complaints via:' }] },
      {
        k: 'li',
        a: 'j',
        r: [{ t: 'Live chat: ', b: true, c: '15803d' }, { t: 'The customer care feature in the Build X app.' }]
      },
      { k: 'li', a: 'j', r: [{ t: 'Hotline: ', b: true, c: '15803d' }, { t: '[HOTLINE]' }] },
      {
        k: 'li',
        a: 'j',
        r: [{ t: 'Customer care Zalo: ', b: true, c: '15803d' }, { t: '[CUSTOMER CARE ZALO CHANNEL]' }]
      },
      { k: 'li', a: 'j', r: [{ t: 'Email: ', b: true, c: '15803d' }, { t: '[EMAIL]' }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X directly resolves complaints about Direct Services and supports reconciliation/mediation for Connected Services. The negotiated response time is at most 07 working days under the Law on Consumer Protection.'
          }
        ]
      },
      { k: 'h2', r: [{ t: "Article 23. Build X's responsibilities", b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X is legally responsible for Direct Services. For Connected Services, Build X is responsible within the scope of platform administration; the obligation to perform the contract belongs to the independent Partner.'
          }
        ]
      },
      { k: 'p', a: 'j', r: [{ t: 'These Terms do not exclude the lawful rights of Consumers under the law.' }] },
      { k: 'h2', r: [{ t: 'Article 24. Force majeure events', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Network or server incidents or wide-scale telecommunications disruptions are considered force majeure only when they meet the legal conditions and do not stem from a security fault of Build X. The parties are responsible for notifying and cooperating to mitigate damage.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 25. Order of precedence of documents', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Where documents differ, the order of precedence is as follows (without excluding mandatory provisions of the law):'
          }
        ]
      },
      { k: 'li', a: 'j', r: [{ t: 'The specific service contract / order that has been established.' }] },
      { k: 'li', a: 'j', r: [{ t: 'Separate sub-system terms (AI, Property).' }] },
      { k: 'li', a: 'j', r: [{ t: 'Payment - Cancellation - Refund Policy.' }] },
      { k: 'li', a: 'j', r: [{ t: 'E-commerce platform operating regulations & Partner rules.' }] },
      { k: 'li', a: 'j', r: [{ t: 'These general Terms of Use.' }] },
      { k: 'li', a: 'j', r: [{ t: 'Privacy Policy (takes priority on data processing).' }] },
      { k: 'h2', r: [{ t: 'Article 26. Updating and amending the terms', b: true, c: '15803d', z: 25 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X will give reasonable prior notice of material changes to the Terms of Use. Updates do not affect rights and contracts established before.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 27. Governing law and dispute resolution', b: true, c: '15803d', z: 25 }] },
      { k: 'p', a: 'j', r: [{ t: 'This Policy is governed by and construed under Vietnamese law.' }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Disputes are resolved by negotiation and mediation first. If no agreement can be reached, the case will be resolved by a competent Court as prescribed.'
          }
        ]
      },
      {
        k: 'h2',
        r: [{ t: 'Article 28. Regulations on the operation of the e-commerce platform', b: true, c: '15803d', z: 25 }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X fully complies with the regulations on direct and intermediary e-commerce business under Law on E-commerce No. 122/2025/QH15 and Decree 248/2026/ND-CP, and publishes separate platform operating regulations as required by law.'
          }
        ]
      }
    ]
  },
  privacy: {
    base: { c: '334155', z: 20 },
    blocks: [
      { k: 'title', a: 'c', r: [{ t: 'PERSONAL DATA PROTECTION POLICY - BUILD X', b: true, c: '15803d', z: 40 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "This Policy sets out in detail how Build X collects, processes, stores and protects users' personal data, in compliance with the Law on Personal Data Protection No. 91/2025/QH15, Decree 356/2025/ND-CP and current security standards."
          }
        ]
      },
      { k: 'p', a: 'j', r: [{ t: 'Article 1. Data controller and processor', b: true, c: '15803d', z: 23 }] },
      { k: 'p', r: [{ t: 'Operating entity: ', b: true, c: '0f172a' }, { t: '[LEGAL ENTITY NAME - NOTE]' }] },
      { k: 'p', r: [{ t: 'Registered address: ', b: true, c: '0f172a' }, { t: '[REGISTERED ADDRESS]' }] },
      { k: 'p', r: [{ t: 'Data protection email: ', b: true, c: '0f172a' }, { t: '[EMAIL]' }] },
      { k: 'p', r: [{ t: 'Support hotline: ', b: true, c: '0f172a' }, { t: '[HOTLINE]' }] },
      { k: 'h2', r: [{ t: 'Article 2. Scope', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Applies to all Users, Customers and Partners when accessing, registering an account, transacting or using any service or utility in the Build X ecosystem.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 3. Types of data Build X collects and processes', b: true, c: '15803d', z: 23 }] },
      {
        k: 'li',
        r: [
          { t: 'Identity & contact: ', b: true, c: '0f172a' },
          {
            t: 'Full name, phone number, email address, contact address. For Partners/sellers, data may include personal or organisational identification numbers, representative information, licences, certificates and other verification information where required by law or the registration process.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Project profile: ', b: true, c: '0f172a' },
          { t: 'Actual site address, land area, construction scale, functions, budget and architectural style.' }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Uploaded documents: ', b: true, c: '0f172a' },
          {
            t: 'Photos of the existing site, technical drawings, design diagrams and land parcel records that users voluntarily provide.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'AI interactions: ', b: true, c: '0f172a' },
          { t: 'Prompts, requirement descriptions, area parameters and space suggestion results.' }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Technical & device: ', b: true, c: '0f172a' },
          {
            t: 'IP address, device ID, operating system, app version, access logs, crash logs, cookies and similar technical data.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Transactions: ', b: true, c: '0f172a' },
          { t: 'Service package information, order value, transaction code and payment/refund history.' }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Geolocation: ', b: true, c: '0f172a' },
          {
            t: 'Address provided by the user or device location (only when the user actively enables and permits it). Location data is strictly protected under the rules for sensitive data.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 4. Collection of personal identity documents', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X does not collect copies of citizen ID cards/passports for ordinary accounts. Where identity verification is needed for legal procedures (notarisation, permit applications, finance), the procedure will be carried out directly by the competent authority/partner. For Partners/sellers, identification information will be collected within the scope required by law.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 5. Sources of data collection', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Personal data may be collected or received from sources consistent with the law and the published purposes of processing, including:'
          }
        ]
      },
      { k: 'li', r: [{ t: 'Information the user actively provides in the application.' }] },
      { k: 'li', r: [{ t: 'Actual activity arising during the use of the service.' }] },
      {
        k: 'li',
        r: [
          {
            t: 'Partners, when the user actively requests a connection or when sharing has an appropriate legal basis.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          {
            t: 'Technology providers, AI providers, cloud service providers, payment units or support service providers, to the extent necessary to provide the service.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Other lawful sources where the law permits and Build X carries out the required notice or mechanism.' }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 6. Purposes of data processing', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Data is processed to the extent necessary for the lawful purposes announced, which may include:' }]
      },
      {
        k: 'li',
        r: [{ t: 'Creating drawings, extracting quantity estimates and implementing construction contracts.' }]
      },
      { k: 'li', r: [{ t: 'Processing input data for AI algorithms that simulate space.' }] },
      {
        k: 'li',
        r: [{ t: 'Forwarding survey/quotation requests to partners strictly as actively designated by the user.' }]
      },
      { k: 'li', r: [{ t: 'Confirming and reconciling transaction payments.' }] },
      { k: 'li', r: [{ t: 'Receiving and providing customer care support and handling complaints.' }] },
      { k: 'li', r: [{ t: 'System security, and detecting and preventing fraud.' }] },
      { k: 'li', r: [{ t: 'Managing accounts, authenticating users/partners and supporting service operations.' }] },
      {
        k: 'li',
        r: [{ t: 'Verifying and managing sellers/partners and performing obligations to comply with applicable law.' }]
      },
      {
        k: 'li',
        r: [
          {
            t: 'Analysing performance, stability and feature usage to improve the product, within the scope of the actual data collected and an appropriate processing basis.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          {
            t: "Sending marketing information only where there is an appropriate processing basis and/or the user's separate choice under applicable regulations."
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 7. Mechanism for obtaining user consent', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X obtains consent through an active confirmation action by the user. The system does not pre-tick boxes by default and does not treat silence as consent.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "Permissions (receiving marketing, location, photo library, third-party sharing) are clearly separated so that users can opt in or decline independently. Users' consent history is fully stored as a legal basis."
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 8. Processing AI data and third parties', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "When using AI features, input data (prompts, drawings, images) is sent to third parties only with the user's prior consent. The name of the service provider and the purpose of processing will be shown transparently on the permission screen."
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'If the user declines, the data will not be sent and the corresponding AI feature may be limited. Build X requires AI partners to fully comply with data protection standards under this policy.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 9. Policy on AI data training', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "Build X does not use users' private data, drawings or projects to train AI models beyond the purpose of directly providing the service. Any change in the purpose of using AI data must be notified and consented to by the user."
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 10. Cross-border data transfer', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Where data is transferred outside Vietnam (cloud storage, server infrastructure), Build X undertakes to fully comply with the impact assessment procedures and safety measures under the Law on Personal Data Protection No. 91/2025/QH15 and Decree 356/2025/ND-CP.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 11. Data sharing and stage-based permissions', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X never sells personal data. Data is shared only with relevant partners (AI, payment, contractors) under the principle of minimum permissions at each stage:'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Reference/search stage: ', b: true, c: '0f172a' },
          {
            t: 'Partners only access the necessary overview of the project, such as the project area, building type or basic needs.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Detailed quotation request stage: ', b: true, c: '0f172a' },
          { t: 'Additional area and preliminary technical parameters are provided.' }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Contract signing stage: ', b: true, c: '0f172a' },
          {
            t: 'The contact phone number and exact address are provided when the customer actively confirms agreement to work directly with that partner.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 12. Mobile device access permissions', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'The Build X app on iOS/Android requests only the minimum permissions directly serving a feature the user activates:'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Camera permission: ', b: true, c: '0f172a' },
          { t: 'Requested only when the user taps to take a photo of the existing site directly from the app.' }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Photo Library permission: ', b: true, c: '0f172a' },
          { t: 'Activated only when the user personally selects photos or drawing documents to upload to a project.' }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Location permission: ', b: true, c: '0f172a' },
          {
            t: "Requested only when the user actively uses a feature that needs the project's location or services near the current location. Build X does not access device location when the function does not need it and does not track location continuously by default."
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Notification permission: ', b: true, c: '0f172a' },
          {
            t: 'Build X may send notifications about project progress, order status, consultation appointments or security alerts. Users can manage notification permission in the operating system settings and choose to receive marketing content through a separate mechanism where applicable.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 13. Data retention period', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Data is stored only for the time necessary to provide the service, meet legal or accounting obligations, or resolve disputes. When the period expires or the purpose of use ends, the data will be deleted or completely anonymised.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 14. Information security measures', b: true, c: '15803d', z: 23 }] },
      { k: 'p', a: 'j', r: [{ t: 'Build X applies optimal cybersecurity measures to protect data:' }] },
      {
        k: 'li',
        r: [
          {
            t: 'Encrypting data in transit and/or at rest where appropriate, together with mechanisms protecting access sessions and credentials.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          {
            t: 'Access control, permissions, appropriate authentication, system logging, firewalls and information security monitoring according to operational needs, on the principle of limiting access to what is necessary.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          {
            t: 'Backups, vulnerability reviews, supplier assessments and information security checks periodically or upon significant changes to the system.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 15. Data incident response procedure', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Upon detecting a data security incident, Build X will immediately isolate and remediate it and notify users and the competent authorities within the time limits prescribed by law.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 16. Rights of data subjects', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Under the Law on Personal Data Protection No. 91/2025/QH15 and applicable law, users have the following rights:'
          }
        ]
      },
      { k: 'li', r: [{ t: 'The right to be informed about the collection and processing of their data.' }] },
      { k: 'li', r: [{ t: 'The right to consent or refuse, and to withdraw previously given consent.' }] },
      { k: 'li', r: [{ t: 'The right to access, view and request a copy of their personal data.' }] },
      { k: 'li', r: [{ t: 'The right to request correction and updating of inaccurate information.' }] },
      {
        k: 'li',
        r: [
          {
            t: 'The right to request deletion of personal data, to restrict or object to processing where the law permits; the right to complain, denounce, sue, claim compensation and other rights under the law.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 17. Exercising the right to withdraw consent', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Users can withdraw consent to data processing at any time through the app settings or by contacting customer care. This does not affect the lawfulness of data processed before.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 18. In-app data deletion and account cancellation', b: true, c: '15803d', z: 23 }] },
      { k: 'p', a: 'j', r: [{ t: 'Users can request account deletion directly in the app. After confirmation:' }] },
      {
        k: 'li',
        r: [
          {
            t: "Once the deletion process is complete, the account can no longer be accessed and is handled under Build X's account deletion mechanism."
          }
        ]
      },
      {
        k: 'li',
        r: [
          {
            t: 'Personal profile data, drawings and AI interaction history are deleted, anonymised or separated from the account to the extent Build X has no obligation or lawful basis to continue retaining them.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          {
            t: 'Payment and accounting records and data that must be kept by law, incomplete transactions or disputes are stored separately within the necessary scope, purpose and period; when the basis for retention ends, the data is handled under the applicable retention and deletion procedure.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 19. Protection of minors', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Account registration or transactions involving minors require the consent or confirmation of the legal representative as regulated.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 20. Updating the privacy policy', b: true, c: '15803d', z: 23 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "This Policy is updated periodically and published in the app. Any change to new purposes of data processing will be notified to seek users' opinions before it is applied."
          }
        ]
      },
      {
        k: 'h2',
        r: [
          { t: 'Article 21. Contact information of the personal data protection officer', b: true, c: '15803d', z: 23 }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'If you have any questions, requests to exercise data rights or privacy concerns, please contact:' }]
      },
      {
        k: 'p',
        r: [{ t: 'Privacy and information security department: ', b: true, c: '0f172a' }, { t: '[PRIVACY DEPARTMENT]' }]
      },
      { k: 'p', r: [{ t: 'Dedicated email: ', b: true, c: '0f172a' }, { t: '[EMAIL]' }] },
      { k: 'p', r: [{ t: 'Registered address: ', b: true, c: '0f172a' }, { t: '[REGISTERED ADDRESS]' }] },
      { k: 'p', r: [{ t: 'Support hotline: ', b: true, c: '0f172a' }, { t: '[HOTLINE]' }] }
    ]
  },
  ecommerce: LEGAL_PARTNERS_EN,
  aiTerms: {
    base: { c: '2d3748', z: 21 },
    blocks: [
      { k: 'title', a: 'c', r: [{ t: 'BUILD X AI TERMS OF USE', b: true, c: '15803d', z: 32 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'These Terms govern the use of AI features on Build X and apply together with the Terms of Use, the Privacy Policy, the Payment, Cancellation and Refund Policy and related regulations.',
            i: true
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 1. Scope of AI features', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X AI supports design suggestions, layout analysis, image simulation, preliminary take-off, reference cost estimates and information search, according to the functions published on the platform.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'The level of automation, technical models and service providers may be adjusted depending on each specific feature.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 2. Transparency when interacting with AI', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X clearly notifies users when they interact with AI or when content is created or significantly edited by AI, as required by law. Where the law requires AI-generated content to be identifiable, Build X will apply appropriate labelling mechanisms to identify the origin of the content.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 3. AI risk classification and management', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Before deploying an AI feature, Build X carries out risk assessment, classification and management in accordance with current law.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Management measures include technical testing, limiting the scope of operation, issuing warnings, system monitoring, recording incidents and review by human experts.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Providing an AI feature does not constitute a commitment to meet every purpose of use or to replace independent professional decisions.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 4. Input data and user rights', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Users may only upload or provide data that they lawfully own or have full authority to license Build X to process.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'It is prohibited to provide trade secrets, third-party personal data, confidential documents or content that infringes intellectual property rights without permission.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Users are fully responsible for the legality, accuracy and truthfulness of the input data.' }]
      },
      { k: 'h2', r: [{ t: 'Article 5. Third-party AI providers', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Some AI features on Build X may integrate infrastructure, models or services from third-party providers.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "Where personal data, drawings or documents must be transferred to a third party, Build X will disclose the partner, the data categories and the purpose of processing, and will seek the user's consent."
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'The corresponding feature may be suspended if the user refuses this mandatory data transfer.' }]
      },
      { k: 'h2', r: [{ t: 'Article 6. Use of data for AI training or fine-tuning', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "Build X does not automatically use users' personal data, images or documents to train or fine-tune AI models for purposes other than providing the service as requested."
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'When there is a plan to use data for new training purposes, Build X will give prior notice and obtain consent as required.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X undertakes to bind AI providers to strictly comply with the corresponding data protection obligations.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 7. Right to use AI results', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'Users may use AI-generated results for lawful purposes within the scope of rights granted by Build X.' }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'AI-generated results may be duplicated or similar across multiple users and are not automatically guaranteed to qualify for intellectual property protection.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'The right to use AI results does not include a transfer of ownership of the source code, models, algorithms or intellectual property belonging to Build X and its licensors.'
          }
        ]
      },
      {
        k: 'h2',
        r: [{ t: 'Article 8. Checking intellectual property and third-party rights', b: true, c: '2d6a4f', z: 24 }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Users are obliged to review intellectual property rights, image rights, privacy rights and related legal aspects themselves before publishing or commercially exploiting AI results.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Although Build X applies filtering techniques and risk warnings, the system does not guarantee complete elimination of every risk of infringing third-party rights.'
          }
        ]
      },
      {
        k: 'h2',
        r: [{ t: 'Article 9. Not a substitute for conditional professional practice', b: true, c: '2d6a4f', z: 24 }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'AI results on design, structure, cost estimates, legal or financial matters are for reference only, unless they have been reviewed and approved by a competent expert.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'AI results must not be used in place of construction drawings, permit applications, professional appraisal or independent consulting services where the law requires personnel with a practising certificate.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 10. Human review', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "For decisions with a major impact on users' rights, safety or property, Build X maintains a human review mechanism as required by law."
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Users may give feedback or request support in reviewing AI results through the Customer Care channel when those results directly affect an actual transaction.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 11. Prohibited acts', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'li',
        a: 'j',
        r: [
          {
            t: 'It is prohibited to use Build X AI for fraud, impersonation, violating privacy, infringing intellectual property, spreading malicious code or harming the system.'
          }
        ]
      },
      {
        k: 'li',
        a: 'j',
        r: [
          {
            t: 'It is prohibited to use AI to create fake records, licences, certificates or professional-capacity information.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X has the right to suspend or limit the service upon detecting a violation, and will handle complaints in accordance with the Terms of Use.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 12. Accuracy and technical limitations', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'note',
        fill: 'f8f9fa',
        sides: { top: ['d97706', 1.3], left: ['d97706', 4.0], bottom: ['d97706', 1.3], right: ['d97706', 1.3] },
        ps: [
          {
            k: 'p',
            a: 'j',
            r: [
              { t: '“AI hallucination”', b: true, c: 'b45309' },
              {
                t: ' is a phenomenon in which AI produces inaccurate information, figures or results that are nevertheless presented plausibly. The Build X AI system may exhibit this phenomenon or other technical limitations.'
              }
            ]
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Users are responsible for cross-checking important information against reputable sources or expert opinion before applying it in practice.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X does not absolutely guarantee the accuracy of every AI result. To the extent permitted by law, Build X disclaims liability for damage caused by users relying entirely on AI; other liabilities are determined under the law and the service commitments.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 13. Incidents and reporting AI content', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Users may report an incident when they find an AI result that contains a serious error, poses a risk of harm or violates the law.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X will receive and assess the report and proactively adjust, remove information or handle it according to the risk management process.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 14. Suspending or changing AI features', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X has the right to change, limit or suspend AI features for maintenance, risk optimisation or legal compliance.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Any paid entitlements affected by a change of service will be handled under the Payment, Cancellation and Refund Policy.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 15. Liability relating to AI', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X is legally responsible within the scope of its obligations, service commitments and applicable law.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X disclaims liability for losses arising from users intentionally misusing AI contrary to warnings or skipping mandatory professional verification steps.'
          }
        ]
      },
      { k: 'p', a: 'j', r: [{ t: 'These Terms do not exclude the mandatory rights of consumers under the law.' }] },
      { k: 'h2', r: [{ t: 'Article 16. Updating the AI Terms', b: true, c: '2d6a4f', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Build X may update these Terms to keep pace with technological development or legal changes.' }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "Material changes directly affecting users' rights and obligations will be notified before they officially apply."
          }
        ]
      }
    ]
  },
  payment: {
    base: { c: '1e293b', z: 21 },
    blocks: [
      {
        k: 'title',
        a: 'c',
        r: [{ t: 'BUILD X PAYMENT, SERVICE CANCELLATION AND REFUND POLICY', b: true, c: '15803d', z: 32 }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'This Policy applies to transactions on Build X and is read together with the Terms of Use, the Privacy Policy, the contract/order and the specific conditions of each service.',
            i: true,
            c: '334155'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 1. Scope and principles of application', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'This Policy governs price listing, payment, deposits/advance payments, service cancellation, refunds and transaction reconciliation for Direct Services and Connected Services on Build X.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'The lawful rights of consumers always take priority. Nothing in this Policy excludes or limits the rights to complain, terminate a contract, obtain a refund or claim compensation under the law.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "Specific provisions in the contract, order or specific conditions of each service take priority, unless they reduce consumers' lawful rights."
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 2. Classification of payment transactions', b: true, c: '166534', z: 24 }] },
      {
        k: 'li',
        r: [
          { t: 'Direct Services: ', b: true, c: '0f172a' },
          {
            t: 'Build X provides or is responsible for the service directly; the Customer pays Build X by the published method.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Connected Services: ', b: true, c: '0f172a' },
          {
            t: "The contract and payment obligations are established directly between the Customer and the Partner, unless it is agreed that Build X collects payment on the Partner's behalf or provides the service directly."
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Digital content/features: ', b: true, c: '0f172a' },
          {
            t: 'Includes AI usage turns, credits, premium software features, and digital content or access rights within the application.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Physical goods/services: ', b: true, c: '0f172a' },
          {
            t: 'Includes surveying, design, construction, supervision, materials, interior and exterior furnishings and services performed outside the application.'
          }
        ]
      },
      {
        k: 'li',
        r: [
          { t: 'Deposit/advance payment: ', b: true, c: '0f172a' },
          { t: 'An amount paid in advance to secure performance of a contract or to start work as agreed.' }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 3. Price transparency and pre-payment information', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Before the Customer confirms payment, Build X fully discloses the following information:' }]
      },
      { k: 'li', r: [{ t: 'Name of the service/product and the provider.' }] },
      { k: 'li', r: [{ t: 'Scope of work.' }] },
      { k: 'li', r: [{ t: 'Price, taxes/fees (if any) and the amount payable.' }] },
      { k: 'li', r: [{ t: 'Payment schedule or milestones.' }] },
      { k: 'li', r: [{ t: 'Cancellation/refund conditions.' }] },
      { k: 'li', r: [{ t: 'Costs that may arise.' }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'No fee is charged outside the published list or without a legal basis. Any change in price or additional costs must be handled under a lawful agreement and the law.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          { t: 'For electronic transactions, the Customer must actively confirm before a payment obligation arises.' }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 4. Payment methods', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X supports lawful payment methods such as bank transfer, payment gateway, card, e-wallet, Apple In-App Purchase or other methods suited to each transaction.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Payment methods are displayed at the time of ordering and may vary by type of service.' }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X never asks Customers to transfer money to a personal account that is not officially published on the platform or in the contract.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 5. Payment for Direct Services', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'For Direct Services, the Customer pays Build X according to the price, schedule and conditions in the quotation, order or contract.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Build X records the payment and issues invoices/documents in accordance with the law.' }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Prepayment, staged payment or holding funds pending acceptance is carried out according to the specific agreement.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 6. Payment for Connected Services', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Unless otherwise stipulated, the Customer pays the Partner directly for Connected Services.' }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X does not by default hold funds, guarantee payment or bear responsibility for refunds of payments made directly between the Customer and the Partner.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "Build X supports reconciliation and complaint resolution within the platform. Where Build X collects payment on the Partner's behalf, the roles, timing of fund transfer, refund conditions and responsibilities of the parties will be disclosed before payment."
          }
        ]
      },
      {
        k: 'h2',
        r: [{ t: 'Article 7. Digital content, AI credits and In-App Purchase', b: true, c: '166534', z: 24 }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'On iOS, digital content/features are paid for through In-App Purchase as required by Apple. Credits/usage turns purchased through In-App Purchase do not expire, unless the law or Apple provides otherwise.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Refund requests for In-App Purchases are handled by Apple under App Store policy. Build X helps provide information and updates the corresponding entitlements upon confirmation from Apple.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'When Apple confirms a refund, Build X has the right to revoke or adjust the corresponding digital entitlements as regulated.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "Digital content that has been unlocked or used may still be refunded if Apple's rules or the law allow it."
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 8. Deposits and advance payments', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'A deposit/advance payment is collected only when its purpose, value, conditions of use, and refund or forfeiture on cancellation are clearly disclosed in the quotation, order or contract.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'For Direct Services, Build X only deducts reasonable, actual and substantiated costs such as work already completed or non-refundable third-party costs as agreed.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'No penalty or deduction may be applied that has not been disclosed in advance, lacks a legal basis or infringes consumer rights.'
          }
        ]
      },
      {
        k: 'h2',
        r: [{ t: 'Article 9. Cancelling Direct Services before performance begins', b: true, c: '166534', z: 24 }]
      },
      { k: 'p', a: 'j', r: [{ t: 'The Customer may cancel a Direct Service before Build X starts the work.' }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'If no unrecoverable cost has arisen, Build X refunds the full amount for the part of the service not yet performed.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "If actual and reasonable preparation costs have arisen at the Customer's request, Build X will deduct these costs on the basis of transparent documents."
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'The free-cancellation deadline or any separate cancellation fee (if any) will be clearly disclosed before the Customer confirms the service.'
          }
        ]
      },
      {
        k: 'h2',
        r: [{ t: 'Article 10. Cancelling Direct Services after performance has begun', b: true, c: '166534', z: 24 }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'If cancellation occurs after the service has begun, the refund equals the value of the unused service less the work already performed and reasonable, unrecoverable costs.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "Build X will provide a reconciliation statement of work done and deductions upon the Customer's request."
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "If the cancellation is due to Build X's fault, the refund and compensation are handled under the contract and the law; the Customer does not bear costs caused by Build X's fault."
          }
        ]
      },
      {
        k: 'h2',
        r: [
          { t: 'Article 11. Consultation appointments, surveys and time-based services', b: true, c: '166534', z: 24 }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'For services booked by time slot (consultation, survey), rules on rescheduling, cancellation or no-show must be displayed before the booking is confirmed.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Unless specific rules are announced in advance, Build X does not charge a cancellation fee or forfeit payment when the Customer reschedules.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'If the expert or Build X cannot provide the service on time and the Customer does not accept an alternative appointment, the payment for the service not performed will be refunded.'
          }
        ]
      },
      {
        k: 'h2',
        r: [{ t: 'Article 12. Construction, supervision, detailed design and materials', b: true, c: '166534', z: 24 }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'For construction, supervision, detailed design or material supply services, cancellation, suspension, settlement and refunds are based on the project contract, the accepted volume of work, materials already ordered and sector-specific law.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'This Policy does not replace the acceptance, warranty, variation-handling, deposit or contract-termination mechanisms agreed in the project contract.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Deductions must be based on documents of actual costs and must safeguard consumer rights.' }]
      },
      {
        k: 'h2',
        r: [{ t: 'Article 13. Where Build X cancels or cannot provide a Direct Service', b: true, c: '166534', z: 24 }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'If Build X cancels or cannot provide a Direct Service through its own fault, the Customer will be refunded the amount corresponding to the part of the service not received.'
          }
        ]
      },
      { k: 'p', a: 'j', r: [{ t: "Switching to an alternative is only done with the Customer's consent." }] },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'The right to claim damages (if any) is determined under the contract and the law.' }]
      },
      {
        k: 'h2',
        r: [
          {
            t: 'Article 14. Right to terminate in distance transactions where mandatory information is incomplete or inaccurate',
            b: true,
            c: '166534',
            z: 24
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'In a distance transaction, if Build X provides missing or inaccurate mandatory information, the consumer has the right to unilaterally terminate the contract within the statutory period.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'When terminating the contract on this ground, the consumer does not bear termination costs, except for the products/services already used.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X will refund the amount for the unused service within 30 days from the date of receiving the termination notice. After this period, Build X must also pay late-payment interest as prescribed by law.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Refunds are made through the original payment method, unless otherwise agreed or the original method is not possible.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 15. Refund methods and timing', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'For transactions collected directly by Build X that qualify for a refund, the refund order will be initiated within 07 working days from confirmation of complete information, unless otherwise provided.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "The time for funds to reach the Customer's account depends on the processes of the bank, payment intermediary or Apple."
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Where the law prescribes a different mandatory period, the statutory period takes priority.' }]
      },
      { k: 'p', a: 'j', r: [{ t: "Transactions through In-App Purchase follow Apple's refund timing and methods." }] },
      {
        k: 'h2',
        r: [
          {
            t: 'Article 16. Duplicate transactions, wrong amounts or unidentified payments',
            b: true,
            c: '166534',
            z: 24
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'The Customer should notify Build X when there is a duplicate charge, a wrong amount or an unrecorded transaction.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'Build X will reconcile and refund or adjust if it determines that the error is its responsibility.' }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'The Customer provides the transaction code or related documents to support reconciliation; Build X never asks for passwords, PINs or OTPs.'
          }
        ]
      },
      {
        k: 'h2',
        r: [{ t: 'Article 17. Promo codes, reward points and promotional benefits', b: true, c: '166534', z: 24 }]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Discount codes, reward points or promotions have no cash-equivalent value, unless the programme provides otherwise.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'When a transaction is cancelled and refunded, attached promotions will be adjusted or restored according to the programme rules.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: "The application of promotions does not limit consumers' statutory refund rights." }]
      },
      { k: 'h2', r: [{ t: 'Article 18. Chargebacks, fraud and refund abuse', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "Customers should first contact Build X's support channel or the payment provider to resolve the matter before requesting a dispute/chargeback."
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X has the right to verify fraud or abuse of the refund mechanism. If intentional violations for profit are detected, Build X may temporarily lock or terminate the account under the Terms of Use.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Handling measures are applied transparently, with a basis, and there is always a channel to receive complaints. A legitimate refund request will not be grounds for locking an account.'
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 19. Cancellation and refund request records', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "The Customer sends the cancellation/refund request through the application or Build X's official customer care channels."
          }
        ]
      },
      { k: 'p', a: 'j', r: [{ t: 'The verification information to be provided includes:' }] },
      { k: 'li', r: [{ t: 'Order/transaction code.' }] },
      { k: 'li', r: [{ t: 'The related service.' }] },
      { k: 'li', r: [{ t: 'Reason for the request.' }] },
      { k: 'li', r: [{ t: 'Payment documents.' }] },
      { k: 'li', r: [{ t: 'Other necessary information depending on the case.' }] },
      { k: 'p', a: 'j', r: [{ t: 'Build X never asks for passwords, PINs, OTPs or full card details.' }] },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'The result will be communicated through the registered account, email, phone or contact channel.' }]
      },
      { k: 'h2', r: [{ t: 'Article 20. Payment disputes in Connected Services', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'For payments made directly to a Partner, the Partner is responsible for refunds under the contract between the two parties.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X helps receive information, reconcile and mediate but does not bear financial obligations in place of the Partner.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: "Where a Partner violates platform rules, Build X may handle the Partner's violation independently of the Customer's financial dispute."
          }
        ]
      },
      { k: 'h2', r: [{ t: 'Article 21. Complaints and dispute resolution', b: true, c: '166534', z: 24 }] },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'The Customer has the right to complain about a transaction, service cancellation or refund through the official customer care channels.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [
          {
            t: 'Build X receives, handles and responds to complaints within the prescribed time limits, in compliance with the Law on Consumer Protection.'
          }
        ]
      },
      {
        k: 'p',
        a: 'j',
        r: [{ t: 'If negotiation fails, the dispute is resolved under the Terms of Use and applicable law.' }]
      },
      { k: 'h2', r: [{ t: 'Article 22. Policy updates and effective date', b: true, c: '166534', z: 24 }] },
      { k: 'p', a: 'j', r: [{ t: 'Build X may update this Policy to comply with the law and its operating model.' }] },
      { k: 'p', a: 'j', r: [{ t: 'Amendments do not affect rights established before the new policy takes effect.' }] },
      {
        k: 'p',
        r: [{ t: 'The applicable version and effective date will be publicly posted on the Build X application.' }]
      }
    ]
  }
}
