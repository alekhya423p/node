module.exports = {
    ROLES: {
        SYSTEM_SUPER_ADMIN: 'system-super-admin', 
        SYSTEM_ADMINISTRATOR: 'system-administrator',
        SYSTEM_TECHNICIAN: 'system-technician',
        COMPANY_ADMINISTRATOR: 'company-administrator',
        COMPANY_SUPPORT_USER: 'company-support-user',
        COMPANY_PORTAL_USER: 'company-portal-user',
        COMPANY_ADMINISTRATOR_WITH_SUPPORT_USER: ['company-administrator', 'company-support-user'],
        COMPANY_ADMINISTRATOR_WITH_PORTAL_USER: ['company-administrator', 'company-portal-user'],
        COMPANY_ADMINISTRATOR_FOR_ALL_USER: ['company-administrator', 'company-support-user', 'company-portal-user'],
        SYSTEM_ADMINISTRATOR_AND_TECHNICIAN: ['system-administrator', 'system-technician'],
        SYSTEM_ADMINISTRATOR_AND_SUPER_ADMIN_AND_TECHNICIAN: ['system-super-admin', 'system-administrator','system-technician'],
        SYSTEM_ADMINISTRATOR_AND_SUPER_ADMIN: ['system-super-admin', 'system-administrator'],
        // MINE 
        // roles allowed to create companies 
        CREATE_COMPANY_SYSTEM : ["system-super-admin", "system-technician", "company-portal-user"]
        
    },
}

// system-super-admin -- all companies active waali
// SYSTEM_TECHNICIAN -- all companies 
// COMPANY_PORTAL_USER -- his companies 

