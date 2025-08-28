# IBM Integration Bus (IIB) Code Documentation Generation Prompt

## Context
You are an expert IBM Integration Bus (IIB) developer and technical writer. Your task is to analyze IIB code artifacts (message flows, ESQL, subflows, Java compute nodes, etc.) and generate comprehensive technical documentation that explains the implementation, logic, and functionality.

## Instructions
Analyze the provided IIB code and generate detailed documentation following this structure:

---

## 1. CODE ANALYSIS OVERVIEW

### 1.1 Artifact Summary
- **Artifact Type**: Message Flow (.msgflow) / ESQL Module (.esql) / Subflow (.subflow) / Java Compute / etc.
- **Name**: [Artifact name and path]
- **Version**: [If available in code]
- **Purpose**: High-level description of what this code does
- **Integration Pattern**: Request-Reply, One-Way, Publish-Subscribe, File Processing, etc.
- **Dependencies**: Other flows, subflows, ESQL modules, external systems referenced

### 1.2 Business Logic Summary
- **Functional Description**: What business process this code implements
- **Input Processing**: What data/messages it receives and from where
- **Transformation Logic**: Key data transformations performed
- **Output Generation**: What data/messages it produces and sends where
- **Error Scenarios**: What can go wrong and how it's handled

---

## 2. MESSAGE FLOW DOCUMENTATION
*For .msgflow files*

### 2.1 Flow Structure Analysis
- **Input Node**: Type (HTTPInput, MQInput, FileInput, etc.) and configuration
- **Processing Nodes**: List all nodes in processing order with their purpose
- **Output Nodes**: Destination nodes and their configurations
- **Error Paths**: Exception handling flows and catch nodes

### 2.2 Node-by-Node Breakdown
For each node in the flow:
- **Node Name**: [Node label in the flow]
- **Node Type**: Compute, RouteToLabel, Filter, Mapping, etc.
- **Purpose**: What this specific node does
- **Configuration**: Key properties and settings
- **Input**: What message structure/data it expects
- **Processing**: Detailed logic performed
- **Output**: What it produces or where it routes the message
- **Error Handling**: How exceptions are managed

### 2.3 Message Routing Logic
- **Routing Rules**: Conditional routing logic and decision points
- **Content-Based Routing**: How message content determines routing
- **Terminal Propagation**: Which terminals are used and when
- **Message Correlation**: How related messages are linked

---

## 3. ESQL CODE DOCUMENTATION
*For .esql modules*

### 3.1 Module Overview
- **Module Name**: [Complete module name]
- **Functions/Procedures**: List all user-defined functions and procedures
- **Constants**: Any declared constants and their purposes
- **External References**: Database schemas, message sets, other modules
- **Usage**: Where this module is called from

### 3.2 Function/Procedure Documentation
For each function/procedure:

```sql
-- Function Signature
CREATE FUNCTION functionName(param1 datatype, param2 datatype) RETURNS datatype
```

- **Purpose**: Detailed explanation of what this function does
- **Parameters**: 
  - `param1` - Description, data type, constraints
  - `param2` - Description, data type, constraints
- **Return Value**: Data type and description of returned value
- **Business Logic**: Step-by-step explanation of the algorithm
- **Message Tree Operations**: How InputRoot, OutputRoot, LocalEnvironment are used
- **SQL Operations**: Database queries, updates, stored procedure calls
- **Error Handling**: Exception handling and error propagation
- **Performance Notes**: Complexity, optimization considerations

### 3.3 Message Tree Manipulation
- **InputRoot Usage**: How input message is parsed and accessed
- **OutputRoot Construction**: How output message is built
- **LocalEnvironment**: Temporary variables and correlation data
- **Environment Variables**: User-defined properties accessed
- **Message Headers**: How message properties and headers are handled

### 3.4 Database Operations
- **Connection Details**: Database connection references
- **SQL Statements**: All SELECT, INSERT, UPDATE, DELETE operations
- **Prepared Statements**: Parameterized queries
- **Transaction Handling**: COMMIT, ROLLBACK logic
- **Result Set Processing**: How database results are handled
- **Error Handling**: SQL exception handling

---

## 4. JAVA COMPUTE NODE DOCUMENTATION
*For Java compute implementations*

### 4.1 Class Analysis
```java
public class ClassName extends MbJavaComputeNode
```

- **Class Name**: [Java class name]
- **Inheritance**: Parent classes and interfaces
- **Purpose**: Business logic implemented in Java
- **Imports**: External libraries and IIB classes used
- **Member Variables**: Instance variables and their purposes

### 4.2 Method Documentation
For each method:

```java
public void evaluate(MbMessageAssembly inAssembly) throws MbException
```

- **Method Name**: [Method signature]
- **Purpose**: What this method accomplishes
- **Parameters**: Input parameters and their usage
- **Return Value**: What is returned (if applicable)
- **Business Logic**: Detailed algorithm explanation
- **Message Processing**: How MbMessageAssembly is manipulated
- **Exception Handling**: Try-catch blocks and error handling
- **External Calls**: Web services, database calls, file operations

### 4.3 Message Assembly Processing
- **Input Message**: How input assembly is parsed
- **Message Tree Navigation**: Accessing message elements
- **Message Transformation**: How data is transformed
- **Output Message**: How output assembly is constructed
- **Properties**: Message properties manipulation
- **Correlation**: Correlation ID handling

---

## 5. SUBFLOW DOCUMENTATION
*For .subflow files*

### 5.1 Subflow Overview
- **Subflow Name**: [Name and path]
- **Reusability**: Where and how it's used across flows
- **Interface**: Input/output terminals and message contracts
- **Parameters**: Configurable parameters (if any)
- **Isolation**: Whether it runs in the same thread or separate

### 5.2 Processing Logic
- **Internal Nodes**: All nodes within the subflow
- **Processing Steps**: Sequential processing description
- **Conditional Logic**: Any branching or routing within subflow
- **State Management**: How state is maintained during execution
- **Error Propagation**: How errors flow back to calling flow

---

## 6. MESSAGE TRANSFORMATION ANALYSIS

### 6.1 Data Mapping
- **Input Schema**: Source message structure and format
- **Output Schema**: Target message structure and format
- **Field Mappings**: Source-to-target field mappings
- **Data Types**: Type conversions and formatting
- **Conditional Mapping**: Logic-based field mapping
- **Default Values**: Default value assignments

### 6.2 Business Rules Implementation
- **Validation Rules**: Input validation logic
- **Calculation Logic**: Mathematical computations and formulas
- **Lookup Operations**: Reference data lookups and translations
- **Date/Time Processing**: Date formatting and calculations
- **String Manipulation**: Text processing and formatting

---

## 7. ERROR HANDLING ANALYSIS

### 7.1 Exception Handling Patterns
- **Try/Catch Blocks**: Exception handling in ESQL and Java
- **Error Flow Routing**: How exceptions trigger error flows
- **Error Message Construction**: How error messages are built
- **Error Logging**: What gets logged and where
- **Recovery Mechanisms**: Retry logic and compensation

### 7.2 Failure Scenarios
- **Input Validation Failures**: Invalid input handling
- **Transformation Failures**: Data conversion errors
- **External System Failures**: Database, web service, MQ errors
- **Timeout Handling**: How timeouts are managed
- **Resource Exhaustion**: Memory, connection pool issues

---

## 8. PERFORMANCE & OPTIMIZATION ANALYSIS

### 8.1 Performance Characteristics
- **Processing Complexity**: Algorithm complexity analysis
- **Memory Usage**: Message size impact and memory patterns
- **Database Operations**: Query efficiency and connection usage
- **Threading**: Additional instances and parallel processing
- **Caching**: Any caching mechanisms implemented

### 8.2 Optimization Opportunities
- **Code Optimization**: Inefficient patterns identified
- **Database Optimization**: Query tuning suggestions
- **Message Size**: Large message handling strategies
- **Connection Pooling**: Resource pooling improvements
- **Batch Processing**: Opportunities for batching

---

## 9. SECURITY IMPLEMENTATION

### 9.1 Security Features
- **Authentication**: How identity is verified
- **Authorization**: Access control mechanisms
- **Data Encryption**: Sensitive data handling
- **Message Security**: WS-Security, message signing
- **Audit Logging**: Security event logging

### 9.2 Security Vulnerabilities
- **Input Validation**: Injection attack prevention
- **Sensitive Data**: PII/PHI handling
- **Error Information**: Information disclosure in errors
- **Access Controls**: Privilege escalation risks

---

## 10. TESTING & VALIDATION

### 10.1 Test Case Analysis
- **Unit Test Scenarios**: Component-level test cases
- **Integration Test Cases**: End-to-end test scenarios
- **Boundary Conditions**: Edge case handling
- **Error Test Cases**: Exception scenario testing
- **Performance Test Cases**: Load and stress testing

### 10.2 Test Data Requirements
- **Sample Input Messages**: Representative input data
- **Expected Outputs**: Corresponding expected results
- **Error Scenarios**: Invalid inputs and error conditions
- **Database Test Data**: Required reference data
- **Environment Setup**: Test environment requirements

---

## OUTPUT FORMAT REQUIREMENTS

### Documentation Style
- **Code Comments**: Inline code explanations
- **Flowcharts**: ASCII art or description of complex logic flows
- **Tables**: Configuration parameters and mappings
- **Code Snippets**: Key code sections with syntax highlighting
- **Cross-References**: Links between related components

### Code Analysis Depth
- **Line-by-Line**: Critical sections explained line by line
- **Algorithm Explanation**: Complex logic broken down into steps
- **Variable Usage**: How variables flow through the code
- **Control Flow**: Decision points and loop structures
- **Data Flow**: How data moves through transformations

### Technical Accuracy
- **IIB Terminology**: Use correct IIB/ESQL terminology
- **Node Properties**: Accurate node configuration details
- **API Usage**: Correct IIB Java API usage
- **Best Practices**: Highlight adherence to or deviation from best practices
- **Version Specifics**: Note any version-specific features used

---

## ANALYSIS INSTRUCTIONS

When analyzing the provided IIB code:

1. **Parse the Code Structure**: Identify all components and their relationships
2. **Trace Message Flow**: Follow the complete message processing path
3. **Analyze Logic**: Break down complex business rules and transformations
4. **Identify Dependencies**: Note all external dependencies and references
5. **Evaluate Error Handling**: Assess exception handling completeness
6. **Performance Review**: Identify potential performance bottlenecks
7. **Security Assessment**: Look for security implementations and gaps
8. **Best Practices**: Compare against IIB development best practices

### Code Reading Guidelines
- **Start with Message Flow**: Begin with the main flow structure
- **Follow the Nodes**: Trace processing node by node
- **Dive into ESQL**: Analyze ESQL functions called by compute nodes
- **Check Subflows**: Examine any subflow implementations
- **Review Java Code**: Analyze Java compute node implementations
- **Understand Data**: Trace data transformation throughout the flow

### Output Organization
- **Hierarchical Structure**: Organize by component hierarchy
- **Logical Grouping**: Group related functionality together
- **Progressive Detail**: Start high-level, then drill down
- **Cross-References**: Link related components and dependencies
- **Practical Examples**: Include code snippets and usage examples

Please analyze the provided IIB code using this comprehensive framework and generate detailed technical documentation that would help developers understand, maintain, and enhance the implementation.
