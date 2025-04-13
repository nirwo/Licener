/**
 * Script to bulk import vendors into Licener
 * Run with: node add-vendors.js
 */
const mongoose = require('mongoose');
const Vendor = require('./models/Vendor');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/licener', { 
  useNewUrlParser: true, 
  useUnifiedTopology: true 
})
.then(() => {
  console.log('MongoDB Connected');
  importVendors();
})
.catch(err => {
  console.error('MongoDB Connection Error:', err);
  process.exit(1);
});

// Vendor data to import
const vendors = [
  {
    "name": "Grammarly",
    "website": "https://www.grammarly.com",
    "description": "Grammarly is an English language writing assistant software tool that reviews spelling, grammar, and tone to help improve writing clarity.",
    "contactEmail": "support@grammarly.com",
    "category": "Software/SaaS"
  },
  {
    "name": "Dropbox",
    "website": "https://www.dropbox.com",
    "description": "Dropbox is a file hosting service offering cloud storage, file synchronization, personal cloud, and client software for file sharing and collaboration.",
    "contactEmail": "https://help.dropbox.com",
    "category": "Software/SaaS"
  },
  {
    "name": "ServiceNow",
    "website": "https://www.servicenow.com",
    "description": "ServiceNow provides a cloud platform to help companies manage digital workflows for enterprise operations (IT service management, HR, etc.).",
    "contactEmail": "https://support.servicenow.com",
    "category": "Software/SaaS"
  },
  {
    "name": "Shopify",
    "website": "https://www.shopify.com",
    "description": "Shopify is a leading e-commerce platform that allows businesses to create online stores and manage retail POS systems, with services for payments, shipping, marketing, and more.",
    "contactEmail": "support@shopify.com",
    "category": "Software/SaaS"
  },
  {
    "name": "Zendesk",
    "website": "https://www.zendesk.com",
    "description": "Zendesk offers cloud-based customer support and sales CRM software, enabling businesses to track support tickets, manage customer communications, and improve customer service across channels.",
    "contactEmail": "support@zendesk.com",
    "category": "Software/SaaS"
  },
  {
    "name": "Workday",
    "website": "https://www.workday.com",
    "description": "Workday is a cloud-based enterprise software vendor specializing in finance and HR software, including financial management and human capital management (HCM) solutions.",
    "contactEmail": "https://www.workday.com/en-us/contact-us.html",
    "category": "Software/SaaS"
  },
  {
    "name": "DocuSign",
    "website": "https://www.docusign.com",
    "description": "DocuSign provides electronic signature technology and digital transaction management services, allowing organizations to send, sign, and manage documents electronically in the cloud.",
    "contactEmail": "support@docusign.com",
    "category": "Software/SaaS"
  },
  {
    "name": "Amazon Web Services (AWS)",
    "website": "https://aws.amazon.com",
    "description": "AWS is Amazon's on-demand cloud computing platform, offering over 200 cloud services (compute, storage, databases, etc.) to individuals, companies, and governments around the world.",
    "contactEmail": "https://aws.amazon.com/contact-us/",
    "category": "Cloud Platform"
  },
  {
    "name": "Microsoft Azure",
    "website": "https://azure.microsoft.com",
    "description": "Microsoft Azure is a cloud computing platform and infrastructure for building, deploying, and managing applications via Microsoft-managed data centers, supporting IaaS, PaaS, and SaaS solutions.",
    "contactEmail": "https://azure.microsoft.com/support",
    "category": "Cloud Platform"
  },
  {
    "name": "Google Cloud Platform",
    "website": "https://cloud.google.com",
    "description": "Google Cloud Platform (GCP) is Google's suite of cloud computing services that runs on the same infrastructure that Google uses for its own products, offering scalable computing, storage, and machine learning services.",
    "contactEmail": "https://cloud.google.com/support",
    "category": "Cloud Platform"
  },
  {
    "name": "IBM Cloud",
    "website": "https://www.ibm.com/cloud",
    "description": "IBM Cloud is a set of enterprise-focused cloud computing services (formerly Bluemix) offered by IBM, providing IaaS, PaaS, and SaaS solutions for computing, storage, AI, IoT, and more.",
    "contactEmail": "https://www.ibm.com/support",
    "category": "Cloud Platform"
  },
  {
    "name": "Oracle Cloud",
    "website": "https://www.oracle.com/cloud/",
    "description": "Oracle Cloud is Oracle Corporation's cloud service platform, providing compute and storage infrastructure as well as a range of enterprise SaaS applications through a global network of data centers.",
    "contactEmail": "https://support.oracle.com",
    "category": "Cloud Platform"
  },
  {
    "name": "Alibaba Cloud",
    "website": "https://www.alibabacloud.com",
    "description": "Alibaba Cloud (Aliyun) is Alibaba Group's cloud computing arm, offering on-demand services including elastic computing, data storage, databases, big data processing, and CDN, serving customers globally (especially in Asia-Pacific).",
    "contactEmail": "contact.us@alibabacloud.com",
    "category": "Cloud Platform"
  },
  {
    "name": "Trello",
    "website": "https://trello.com",
    "description": "Trello is a visual collaboration tool where teams organize projects into boards. It uses a Kanban-style system of boards, lists, and cards to help track tasks and workflows in a simple, flexible interface.",
    "contactEmail": "support@trello.com",
    "category": "Productivity Tool"
  },
  {
    "name": "Notion",
    "website": "https://www.notion.so",
    "description": "Notion is an all-in-one productivity app that combines note-taking, document creation, project management, and database functions in a collaborative workspace, allowing teams to create wikis, manage projects, and track data in one place.",
    "contactEmail": "team@makenotion.com",
    "category": "Productivity Tool"
  },
  {
    "name": "Asana",
    "website": "https://asana.com",
    "description": "Asana is a web and mobile application designed to help teams organize, track, and manage their work. It enables task assignment, project planning, timelines, and collaboration to improve team productivity.",
    "contactEmail": "support@asana.com",
    "category": "Productivity Tool"
  },
  {
    "name": "Airtable",
    "website": "https://airtable.com",
    "description": "Airtable is a cloud collaboration service that functions as a hybrid of a spreadsheet and a database. It allows users to create custom databases with a user-friendly spreadsheet interface for managing projects, content, or any structured data.",
    "contactEmail": "support@airtable.com",
    "category": "Productivity Tool"
  },
  {
    "name": "Basecamp",
    "website": "https://basecamp.com",
    "description": "Basecamp is a project management and team communication tool that provides to-do lists, message boards, file sharing, schedules, and real-time group chat, all in one platform to help teams stay organized and on the same page.",
    "contactEmail": "https://basecamp.com/support",
    "category": "Productivity Tool"
  },
  {
    "name": "GitHub",
    "website": "https://github.com",
    "description": "GitHub is a code hosting and version control platform that lets developers collaborate on projects. It provides Git-based repository hosting with additional features like pull requests, code reviews, issue tracking, and CI/CD integrations.",
    "contactEmail": "support@github.com",
    "category": "Developer Tool"
  },
  {
    "name": "GitLab",
    "website": "https://gitlab.com",
    "description": "GitLab is an open-source DevOps platform providing Git repository management alongside a suite of built-in tools for CI/CD, code review, issue tracking, and DevOps lifecycle integration, enabling teams to collaborate on code from planning to deployment.",
    "contactEmail": "support@gitlab.com",
    "category": "Developer Tool"
  },
  {
    "name": "Atlassian",
    "website": "https://www.atlassian.com",
    "description": "Atlassian is an enterprise software company known for tools like Jira (for issue and project tracking), Confluence (for documentation and wiki), and Bitbucket (for code management). Atlassian's collaboration and developer tools are widely used for software development and project management.",
    "contactEmail": "https://support.atlassian.com",
    "category": "Developer Tool"
  },
  {
    "name": "JetBrains",
    "website": "https://www.jetbrains.com",
    "description": "JetBrains is a software development company that creates IDEs and developer tools (e.g., IntelliJ IDEA, PyCharm, WebStorm). Its tools are designed to improve developer productivity through intelligent code analysis, refactoring support, and deep integration for various programming languages.",
    "contactEmail": "https://www.jetbrains.com/support/",
    "category": "Developer Tool"
  },
  {
    "name": "Postman",
    "website": "https://www.postman.com",
    "description": "Postman is an API development platform that streamlines each step of building, testing, documenting, and monitoring APIs. It provides an interface to construct API requests, automate test suites, simulate endpoints, and collaborate on API design in one environment.",
    "contactEmail": "help@postman.com",
    "category": "Developer Tool"
  },
  {
    "name": "Docker",
    "website": "https://www.docker.com",
    "description": "Docker is an open platform for containerization. It enables developers to package applications and their dependencies into portable containers that can run consistently across environments, using OS-level virtualization to isolate software in standardized units called containers.",
    "contactEmail": "support@docker.com",
    "category": "Developer Tool"
  },
  {
    "name": "Salesforce",
    "website": "https://www.salesforce.com",
    "description": "Salesforce provides a leading cloud-based CRM platform. It offers tools for sales automation, customer service (Service Cloud), marketing automation (Marketing Cloud), and a broad ecosystem of enterprise applications, enabling companies to manage customer relationships and analytics in the cloud.",
    "contactEmail": "https://help.salesforce.com",
    "category": "CRM/ERP/Marketing"
  },
  {
    "name": "HubSpot",
    "website": "https://www.hubspot.com",
    "description": "HubSpot is an inbound marketing and sales platform. It includes a CRM and offers tools for content creation, email marketing, social media management, lead nurturing, sales pipeline management, and customer service – all aimed at helping companies attract, engage, and delight customers.",
    "contactEmail": "https://help.hubspot.com",
    "category": "CRM/ERP/Marketing"
  },
  {
    "name": "Zoho",
    "website": "https://www.zoho.com",
    "description": "Zoho is a technology company that provides a comprehensive suite of web-based business applications. Its offerings range from Zoho CRM to Zoho Projects, Zoho Books (accounting), Zoho Mail, and many others, covering CRM, ERP, office productivity, and IT management for businesses of all sizes.",
    "contactEmail": "support@zoho.com",
    "category": "CRM/ERP/Marketing"
  },
  {
    "name": "Monday.com",
    "website": "https://monday.com",
    "description": "Monday.com is a Work OS (work operating system) that enables teams to create custom workflow apps for any project or process. It features visual project boards, timelines, and collaboration tools that can be tailored to manage tasks, sales pipelines, marketing campaigns, CRM data, and more.",
    "contactEmail": "support@monday.com",
    "category": "CRM/ERP/Marketing"
  },
  {
    "name": "SAP",
    "website": "https://www.sap.com",
    "description": "SAP SE is a multinational enterprise software company known for its ERP software. SAP's software suite helps businesses manage financials, supply chain, customer relationships, and other business operations in an integrated manner, and it includes solutions like SAP S/4HANA (ERP) and SAP CRM.",
    "contactEmail": "https://support.sap.com",
    "category": "CRM/ERP/Marketing"
  },
  {
    "name": "Oracle (NetSuite)",
    "website": "https://www.oracle.com",
    "description": "Oracle is a global software company that provides enterprise software and database solutions. In the CRM/ERP domain, Oracle offers Oracle NetSuite (a leading cloud ERP for business management) and Oracle's own ERP and CRM applications, delivering solutions for finance, HR, supply chain, sales, and marketing.",
    "contactEmail": "https://support.oracle.com",
    "category": "CRM/ERP/Marketing"
  },
  {
    "name": "Mailchimp",
    "website": "https://mailchimp.com",
    "description": "Mailchimp is a marketing automation platform and an email marketing service. It enables businesses to design and send email campaigns, manage mailing lists, set up marketing automations, and track campaign analytics, catering especially to small and medium-sized businesses.",
    "contactEmail": "support@mailchimp.com",
    "category": "CRM/ERP/Marketing"
  },
  {
    "name": "Norton",
    "website": "https://us.norton.com",
    "description": "Norton is a cybersecurity software brand known for its antivirus and internet security products. Norton 360 and related offerings provide protection against viruses, malware, phishing, and other online threats for PCs and mobile devices, along with features like VPN and identity protection.",
    "contactEmail": "https://support.norton.com",
    "category": "Cybersecurity"
  },
  {
    "name": "McAfee",
    "website": "https://www.mcafee.com",
    "description": "McAfee is a global computer security company offering antivirus and cybersecurity solutions for consumers and enterprises. Its products include McAfee Total Protection for endpoint security and a range of tools for threat prevention, detection, and data protection on devices and networks.",
    "contactEmail": "https://www.mcafee.com/support",
    "category": "Cybersecurity"
  },
  {
    "name": "CrowdStrike",
    "website": "https://www.crowdstrike.com",
    "description": "CrowdStrike is a cybersecurity company specializing in endpoint protection and threat intelligence. Its cloud-native Falcon platform provides next-gen antivirus, endpoint detection and response (EDR), threat hunting, and incident response services to stop breaches in real time.",
    "contactEmail": "https://supportportal.crowdstrike.com",
    "category": "Cybersecurity"
  },
  {
    "name": "Palo Alto Networks",
    "website": "https://www.paloaltonetworks.com",
    "description": "Palo Alto Networks is a leading cybersecurity provider known for its next-generation firewalls and comprehensive security platform. It offers solutions for network security (firewalls, IPS), cloud security, endpoint protection (Traps/Cortex XDR), and security operations with an emphasis on prevention of cyber attacks.",
    "contactEmail": "https://support.paloaltonetworks.com",
    "category": "Cybersecurity"
  },
  {
    "name": "Check Point",
    "website": "https://www.checkpoint.com",
    "description": "Check Point Software Technologies is a multinational security vendor that provides software and hardware for IT security, including enterprise network firewalls, VPN appliances, unified threat management, and cloud security solutions. It has been a long-time leader in firewall and network protection technologies.",
    "contactEmail": "https://supportcenter.checkpoint.com",
    "category": "Cybersecurity"
  },
  {
    "name": "Kaspersky",
    "website": "https://www.kaspersky.com",
    "description": "Kaspersky is a cybersecurity and antivirus company known for Kaspersky Anti-Virus and Internet Security suites. It delivers security solutions for endpoints, businesses, and industrial systems, providing malware protection, threat intelligence, and cybersecurity services across the globe.",
    "contactEmail": "https://support.kaspersky.com",
    "category": "Cybersecurity"
  },
  {
    "name": "Fortinet",
    "website": "https://www.fortinet.com",
    "description": "Fortinet is a cybersecurity company that develops and markets a broad range of security solutions. Its flagship FortiGate firewalls, along with its antivirus, intrusion prevention, and endpoint security products (part of the Fortinet Security Fabric), protect enterprise networks and cloud environments from cyber threats.",
    "contactEmail": "https://support.fortinet.com",
    "category": "Cybersecurity"
  },
  {
    "name": "Zoom",
    "website": "https://zoom.us",
    "description": "Zoom is a cloud-based video conferencing service that supports HD video meetings, webinars, and group messaging. It enables remote teams and participants to communicate via video, audio, and chat on various devices, and gained prominence as a go-to platform for virtual meetings and online classes.",
    "contactEmail": "https://support.zoom.us",
    "category": "Communication/Collaboration"
  },
  {
    "name": "Google Workspace",
    "website": "https://workspace.google.com",
    "description": "Google Workspace is Google's cloud-based productivity and collaboration suite (formerly G Suite). It includes Gmail for email, Google Drive for cloud storage, Docs/Sheets/Slides for content creation, Google Meet for video conferencing, and other tools unified under a single account for business collaboration.",
    "contactEmail": "https://support.google.com/a",
    "category": "Communication/Collaboration"
  },
  {
    "name": "Microsoft 365",
    "website": "https://www.microsoft.com/microsoft-365",
    "description": "Microsoft 365 is a subscription-based suite that includes Office productivity apps (Word, Excel, PowerPoint, Outlook, etc.), Microsoft Teams for teamwork and video meetings, OneDrive cloud storage, and other services, all kept up-to-date and integrated for communication and collaboration.",
    "contactEmail": "https://support.microsoft.com",
    "category": "Communication/Collaboration"
  },
  {
    "name": "Slack",
    "website": "https://slack.com",
    "description": "Slack is a business communication platform that provides chat rooms (channels) organized by topic, direct messaging, and integrations with many services. It allows teams to collaborate in real time, replacing email for many internal communications with searchable, centralized messaging.",
    "contactEmail": "feedback@slack.com",
    "category": "Communication/Collaboration"
  },
  {
    "name": "Cisco Webex",
    "website": "https://www.webex.com",
    "description": "Cisco Webex is a suite of collaboration tools including Webex Meetings for secure video conferencing and Webex App (formerly Teams) for team messaging. It enables video meetings, screen sharing, webinar hosting, and persistent group chat, supporting remote and hybrid work with enterprise-grade security.",
    "contactEmail": "https://help.webex.com",
    "category": "Communication/Collaboration"
  },
  {
    "name": "GoTo Meeting",
    "website": "https://www.goto.com",
    "description": "GoTo Meeting (by GoTo, formerly LogMeIn) is a web-hosted video conferencing tool for online meetings and collaboration. It allows users to host and join meetings with video, VoIP/call-in audio, and screen-sharing capabilities. The GoTo suite also includes GoToWebinar for larger broadcast events and GoToConnect for unified communications.",
    "contactEmail": "https://support.goto.com",
    "category": "Communication/Collaboration"
  }
];

// Import function
async function importVendors() {
  console.log(`Starting import of ${vendors.length} vendors...`);
  let added = 0;
  let skipped = 0;
  let failed = 0;

  for (const vendor of vendors) {
    try {
      // Check if vendor already exists
      const existingVendor = await Vendor.findOne({ 
        name: { $regex: new RegExp(`^${escapeRegExp(vendor.name)}$`, 'i') }
      });
      
      if (existingVendor) {
        console.log(`Vendor "${vendor.name}" already exists, skipping`);
        skipped++;
        continue;
      }
      
      // Map vendor data to database schema
      const newVendor = new Vendor({
        name: vendor.name,
        website: vendor.website,
        description: vendor.description,
        contactEmail: vendor.contactEmail,
        notes: `Category: ${vendor.category}`
      });
      
      // Save to database
      await newVendor.save();
      console.log(`Added vendor: ${vendor.name}`);
      added++;
    } catch (err) {
      console.error(`Error adding vendor "${vendor.name}":`, err.message);
      failed++;
    }
  }

  console.log('\nVendor import completed:');
  console.log(`- Added: ${added}`);
  console.log(`- Skipped (already exist): ${skipped}`);
  console.log(`- Failed: ${failed}`);
  console.log(`- Total processed: ${vendors.length}`);
  
  // Close database connection
  mongoose.connection.close();
  console.log('Database connection closed');
}

// Helper to escape special characters in regex
function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
} 