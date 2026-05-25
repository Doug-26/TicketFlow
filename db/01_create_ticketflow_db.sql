/* ============================================================
   TicketFlow - MVP Database Creation Script
   Target: SQL Server (SSMS 22)

   Run this script ONCE in SSMS to create the database + tables.
   To re-run cleanly: DROP DATABASE TicketFlowDb; first.

   Tables (in build order):
     1. Roles
     2. Departments
     3. Employees
     4. DepartmentHeads
     5. RequestTypes
     6. RequestTypeFields
     7. Tickets
     8. TicketStatusHistory
   ============================================================ */


/* ------------------------------------------------------------
   STEP 1: Create the database
   ------------------------------------------------------------ */
IF DB_ID('TicketFlowDb') IS NULL
BEGIN
    CREATE DATABASE TicketFlowDb;
END;
GO

USE TicketFlowDb;
GO


/* ------------------------------------------------------------
   STEP 2: Roles
   - Lookup table. Seeded with Employee / Admin / HR.
   - HR is the role allowed (by the API) to create employees.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Roles
(
    RoleId      INT IDENTITY(1,1) NOT NULL,
    Name        VARCHAR(50)       NOT NULL,
    IsActive    BIT               NOT NULL CONSTRAINT DF_Roles_IsActive  DEFAULT (1),
    CreatedAt   DATETIME2         NOT NULL CONSTRAINT DF_Roles_CreatedAt DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_Roles      PRIMARY KEY (RoleId),
    CONSTRAINT UQ_Roles_Name UNIQUE      (Name)
);
GO


/* ------------------------------------------------------------
   STEP 3: Departments
   ------------------------------------------------------------ */
CREATE TABLE dbo.Departments
(
    DepartmentId    INT IDENTITY(1,1) NOT NULL,
    Name            NVARCHAR(100)     NOT NULL,
    Description     NVARCHAR(500)     NULL,
    IsActive        BIT               NOT NULL CONSTRAINT DF_Departments_IsActive  DEFAULT (1),
    CreatedAt       DATETIME2         NOT NULL CONSTRAINT DF_Departments_CreatedAt DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_Departments      PRIMARY KEY (DepartmentId),
    CONSTRAINT UQ_Departments_Name UNIQUE      (Name)
);
GO


/* ------------------------------------------------------------
   STEP 4: Employees
   - RoleId is required (FK to Roles).
   - DepartmentId is nullable (an Admin/HR may have no dept).
   ------------------------------------------------------------ */
CREATE TABLE dbo.Employees
(
    EmployeeId      INT IDENTITY(1,1) NOT NULL,
    FullName        NVARCHAR(150)     NOT NULL,
    Email           NVARCHAR(200)     NOT NULL,
    PasswordHash    NVARCHAR(255)     NOT NULL,
    RoleId          INT               NOT NULL,
    DepartmentId    INT               NULL,
    IsActive        BIT               NOT NULL CONSTRAINT DF_Employees_IsActive  DEFAULT (1),
    CreatedAt       DATETIME2         NOT NULL CONSTRAINT DF_Employees_CreatedAt DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_Employees             PRIMARY KEY (EmployeeId),
    CONSTRAINT UQ_Employees_Email       UNIQUE      (Email),
    CONSTRAINT FK_Employees_Role        FOREIGN KEY (RoleId)
        REFERENCES dbo.Roles (RoleId)               ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT FK_Employees_Department  FOREIGN KEY (DepartmentId)
        REFERENCES dbo.Departments (DepartmentId)   ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

CREATE INDEX IX_Employees_DepartmentId ON dbo.Employees (DepartmentId);
CREATE INDEX IX_Employees_RoleId       ON dbo.Employees (RoleId);
GO


/* ------------------------------------------------------------
   STEP 5: DepartmentHeads
   - Tracks the head(s) of each department.
   - IsActive flag plus a filtered unique index ensures at most
     ONE active head per department at any time, while keeping
     inactive rows as history.
   ------------------------------------------------------------ */
CREATE TABLE dbo.DepartmentHeads
(
    DepartmentHeadId    INT IDENTITY(1,1) NOT NULL,
    DepartmentId        INT               NOT NULL,
    EmployeeId          INT               NOT NULL,
    IsActive            BIT               NOT NULL CONSTRAINT DF_DepartmentHeads_IsActive  DEFAULT (1),
    CreatedAt           DATETIME2         NOT NULL CONSTRAINT DF_DepartmentHeads_CreatedAt DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_DepartmentHeads             PRIMARY KEY (DepartmentHeadId),
    CONSTRAINT FK_DepartmentHeads_Department  FOREIGN KEY (DepartmentId)
        REFERENCES dbo.Departments (DepartmentId) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT FK_DepartmentHeads_Employee    FOREIGN KEY (EmployeeId)
        REFERENCES dbo.Employees (EmployeeId)     ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- Only one ACTIVE head per department (filtered unique index).
CREATE UNIQUE INDEX UQ_DepartmentHeads_ActiveDept
    ON dbo.DepartmentHeads (DepartmentId)
    WHERE IsActive = 1;
GO


/* ------------------------------------------------------------
   STEP 6: RequestTypes
   - The dynamic fields are now in RequestTypeFields (step 7),
     not a JSON column here.
   ------------------------------------------------------------ */
CREATE TABLE dbo.RequestTypes
(
    RequestTypeId   INT IDENTITY(1,1) NOT NULL,
    DepartmentId    INT               NOT NULL,
    Name            NVARCHAR(100)     NOT NULL,
    IsActive        BIT               NOT NULL CONSTRAINT DF_RequestTypes_IsActive  DEFAULT (1),
    CreatedAt       DATETIME2         NOT NULL CONSTRAINT DF_RequestTypes_CreatedAt DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_RequestTypes              PRIMARY KEY (RequestTypeId),
    CONSTRAINT UQ_RequestTypes_Dept_Name    UNIQUE      (DepartmentId, Name),
    CONSTRAINT FK_RequestTypes_Department   FOREIGN KEY (DepartmentId)
        REFERENCES dbo.Departments (DepartmentId) ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO


/* ------------------------------------------------------------
   STEP 7: RequestTypeFields
   - One row per dynamic field a request type asks for.
   - FieldOptionsJson is the choices for select/radio/checkbox,
     e.g. '["8GB","16GB","32GB"]'.
   ------------------------------------------------------------ */
CREATE TABLE dbo.RequestTypeFields
(
    RequestTypeFieldId  INT IDENTITY(1,1) NOT NULL,
    RequestTypeId       INT               NOT NULL,
    FieldName           NVARCHAR(100)     NOT NULL,
    FieldLabel          NVARCHAR(200)     NOT NULL,
    FieldType           VARCHAR(30)       NOT NULL,
    FieldOptionsJson    NVARCHAR(MAX)     NULL,
    IsRequired          BIT               NOT NULL CONSTRAINT DF_RequestTypeFields_IsRequired   DEFAULT (0),
    DisplayOrder        INT               NOT NULL CONSTRAINT DF_RequestTypeFields_DisplayOrder DEFAULT (0),
    CreatedAt           DATETIME2         NOT NULL CONSTRAINT DF_RequestTypeFields_CreatedAt    DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_RequestTypeFields                 PRIMARY KEY (RequestTypeFieldId),
    CONSTRAINT UQ_RequestTypeFields_Type_Name       UNIQUE      (RequestTypeId, FieldName),
    CONSTRAINT FK_RequestTypeFields_RequestType     FOREIGN KEY (RequestTypeId)
        REFERENCES dbo.RequestTypes (RequestTypeId) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT CK_RequestTypeFields_OptionsJson
        CHECK (FieldOptionsJson IS NULL OR ISJSON(FieldOptionsJson) = 1)
);
GO


/* ------------------------------------------------------------
   STEP 8: Tickets
   - TicketNumber is a human-friendly id (e.g. TKT-2026-00001),
     generated by the API and inserted here.
   - Status is a plain VARCHAR per design.
   - Priority defaults to 'Medium'. Suggested values: Low / Medium / High.
   - FieldValues holds the JSON object of dynamic answers,
     keyed by RequestTypeFields.FieldName.
   ------------------------------------------------------------ */
CREATE TABLE dbo.Tickets
(
    TicketId              INT IDENTITY(1,1) NOT NULL,
    TicketNumber          VARCHAR(30)       NOT NULL,
    RaisedByEmployeeId    INT               NOT NULL,
    DepartmentId          INT               NOT NULL,
    RequestTypeId         INT               NOT NULL,
    AssignedToEmployeeId  INT               NULL,
    Title                 NVARCHAR(200)     NOT NULL,
    Description           NVARCHAR(MAX)     NULL,
    FieldValues           NVARCHAR(MAX)     NULL,
    Priority              VARCHAR(20)       NOT NULL CONSTRAINT DF_Tickets_Priority  DEFAULT ('Medium'),
    Status                VARCHAR(30)       NOT NULL CONSTRAINT DF_Tickets_Status    DEFAULT ('Open'),
    CreatedAt             DATETIME2         NOT NULL CONSTRAINT DF_Tickets_CreatedAt DEFAULT (SYSUTCDATETIME()),
    UpdatedAt             DATETIME2         NOT NULL CONSTRAINT DF_Tickets_UpdatedAt DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_Tickets                    PRIMARY KEY (TicketId),
    CONSTRAINT UQ_Tickets_TicketNumber       UNIQUE      (TicketNumber),
    CONSTRAINT FK_Tickets_RaisedBy           FOREIGN KEY (RaisedByEmployeeId)
        REFERENCES dbo.Employees (EmployeeId)       ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT FK_Tickets_Department         FOREIGN KEY (DepartmentId)
        REFERENCES dbo.Departments (DepartmentId)   ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT FK_Tickets_RequestType        FOREIGN KEY (RequestTypeId)
        REFERENCES dbo.RequestTypes (RequestTypeId) ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT FK_Tickets_AssignedTo         FOREIGN KEY (AssignedToEmployeeId)
        REFERENCES dbo.Employees (EmployeeId)       ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT CK_Tickets_FieldValuesJson
        CHECK (FieldValues IS NULL OR ISJSON(FieldValues) = 1)
);
GO

CREATE INDEX IX_Tickets_AssignedToEmployeeId  ON dbo.Tickets (AssignedToEmployeeId);
CREATE INDEX IX_Tickets_DepartmentId_Status   ON dbo.Tickets (DepartmentId, Status);
CREATE INDEX IX_Tickets_RaisedByEmployeeId    ON dbo.Tickets (RaisedByEmployeeId);
GO


/* ------------------------------------------------------------
   STEP 9: TicketStatusHistory
   - One row per status change. The API inserts here every time
     it updates Tickets.Status. First row per ticket: OldStatus = NULL.
   ------------------------------------------------------------ */
CREATE TABLE dbo.TicketStatusHistory
(
    HistoryId              INT IDENTITY(1,1) NOT NULL,
    TicketId               INT               NOT NULL,
    OldStatus              VARCHAR(30)       NULL,
    NewStatus              VARCHAR(30)       NOT NULL,
    ChangedByEmployeeId    INT               NOT NULL,
    Remarks                NVARCHAR(500)     NULL,
    ChangedAt              DATETIME2         NOT NULL CONSTRAINT DF_TicketStatusHistory_ChangedAt DEFAULT (SYSUTCDATETIME()),

    CONSTRAINT PK_TicketStatusHistory                  PRIMARY KEY (HistoryId),
    CONSTRAINT FK_TicketStatusHistory_Ticket           FOREIGN KEY (TicketId)
        REFERENCES dbo.Tickets (TicketId)        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT FK_TicketStatusHistory_ChangedByEmp     FOREIGN KEY (ChangedByEmployeeId)
        REFERENCES dbo.Employees (EmployeeId)    ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

CREATE INDEX IX_TicketStatusHistory_TicketId ON dbo.TicketStatusHistory (TicketId);
GO


/* ------------------------------------------------------------
   STEP 10: Seed data
   - Replace PLACEHOLDER_HASH with real BCrypt/PBKDF2 hashes
     once the API has a hashing service.
   ------------------------------------------------------------ */

-- Roles
INSERT INTO dbo.Roles (Name) VALUES ('Employee'), ('Admin'), ('HR');
-- RoleId: 1=Employee, 2=Admin, 3=HR

-- Departments
INSERT INTO dbo.Departments (Name, Description)
VALUES
    (N'IT', N'Information Technology'),
    (N'HR', N'Human Resources');
-- DepartmentId: 1=IT, 2=HR

-- Employees: 1 admin (no dept), 1 HR (HR dept), 2 IT employees
INSERT INTO dbo.Employees (FullName, Email, PasswordHash, RoleId, DepartmentId)
VALUES
    (N'System Admin',  N'admin@ticketflow.local', N'PLACEHOLDER_HASH', 2, NULL),  -- Admin
    (N'Helen HR',      N'hr@ticketflow.local',    N'PLACEHOLDER_HASH', 3, 2),     -- HR
    (N'John Engineer', N'john@ticketflow.local',  N'PLACEHOLDER_HASH', 1, 1),     -- Employee, IT
    (N'Jane Engineer', N'jane@ticketflow.local',  N'PLACEHOLDER_HASH', 1, 1);     -- Employee, IT
-- EmployeeId: 1=Admin, 2=Helen HR, 3=John, 4=Jane

-- Department head: make John (EmployeeId=3) the active head of IT (DepartmentId=1)
INSERT INTO dbo.DepartmentHeads (DepartmentId, EmployeeId, IsActive)
VALUES (1, 3, 1);

-- Request Types for IT department
INSERT INTO dbo.RequestTypes (DepartmentId, Name)
VALUES
    (1, N'Laptop Request'),   -- RequestTypeId = 1
    (1, N'Mouse Request');    -- RequestTypeId = 2

-- Fields for "Laptop Request"
INSERT INTO dbo.RequestTypeFields
    (RequestTypeId, FieldName, FieldLabel, FieldType, FieldOptionsJson, IsRequired, DisplayOrder)
VALUES
    (1, N'ram', N'RAM',              'select', N'["8GB","16GB","32GB"]',           1, 1),
    (1, N'os',  N'Operating System', 'select', N'["Windows 11","macOS","Ubuntu"]', 1, 2);

-- Fields for "Mouse Request"
INSERT INTO dbo.RequestTypeFields
    (RequestTypeId, FieldName, FieldLabel, FieldType, FieldOptionsJson, IsRequired, DisplayOrder)
VALUES
    (2, N'mouseType', N'Mouse Type', 'radio', N'["Wired","Wireless"]', 1, 1);
GO


/* ------------------------------------------------------------
   STEP 11: Optional verification queries
   ------------------------------------------------------------ */
-- SELECT name FROM sys.tables WHERE schema_id = SCHEMA_ID('dbo');  -- should list 8 tables
-- SELECT * FROM dbo.Roles;
-- SELECT * FROM dbo.Departments;
-- SELECT * FROM dbo.Employees;
-- SELECT * FROM dbo.DepartmentHeads;
-- SELECT * FROM dbo.RequestTypes;
-- SELECT * FROM dbo.RequestTypeFields;
