## Introduction

So even though this website is designed for all learners of system design, we understand that a lot of users want to also get better at interview prep. Also the structure in which those interviews are conducted really do help compartmentalize the different steps that go into thinking about designing software systems.

Typically the structure of backend system design interviews is **functional requirements**, **non functional requirements**, **api design and database modelling**, **high-level design**, and **detailed component design**.

---

## How to Start the Interview

At every step it's important to ask any clarifying questions to make sure you are designing the right thing.

**Examples:**

- How many users are we to support?
- What parts of the actual feature do we care about building (i.e., we are not building all of the functionality for Facebook posts, we need to know which pieces).

---

## Functional Requirements

In this section we are primarily concerned with **what the system actually needs to do**.

**For URL Shortening Service:**

- We care about converting a long URL to a unique short URL.
- We also care about redirecting any user to the long URL if a short URL is entered in their browser.

---

## Non-Functional Requirements

#### **Availability / Redundancy**

**Definition:** The percentage of time the system is operational and accessible to users. Achieved through redundancy (e.g., replication, failover mechanisms) to ensure the service remains functional despite component failures.

**For URL Shortener:** The redirection service (the "read" path) must be near 100% available. Any downtime means short links are broken, and users cannot reach their target pages.

**Design Example:** Implement active-active replication across multiple geographical regions or data centers to handle regional outages.

#### Latency

**Definition:** The delay between a user's request and the system's response (response time). This NFR defines the maximum acceptable time for a specific operation.

**For URL Shortener:** Redirection Latency must be extremely low (e.g., under 50 milliseconds) as it directly impacts the user's perceived page load time. The short key lookup needs to be nearly instant.

#### Reliability

**Definition:** The probability that the system will operate without failure over a specified period under stated conditions. It ensures the service performs its intended function accurately and consistently.

**For URL Shortener:** The service must consistently guarantee that the short key resolves to the correct original long URL without errors, and the key generation must be collision-free (no two long URLs map to the same short key).

#### Consistency

**Definition:** The guarantee that a read operation returns the most recent, committed write across all service instances or data replicas. It dictates the rules for data synchronization across a distributed system.

**For URL Shortener:** Once a new short URL is created and saved, subsequent read requests for that key must immediately resolve to the correct long URL. Strong consistency is typically required for the core mapping data.

---

## API Design

#### Modeling the System: Entities and APIs

This phase translates the system's goals (functional requirements) into structured data and communication interfaces.

#### Communication Flow Analysis

- This phase is about translating the system's goals (functional requirements) into structured data and communication interfaces.
- Is our communication **one directional**? If that's the case, which API are we using (**REST**, **RPC**, **GraphQL**)?
- Is communication **bi-directional**? Are we using **WebSockets** or **Server-Sent Events**?

#### API Design

We define the primary actions required to fulfill the functional goals.

**A. Link Creation (Write Operation)**

Method/Endpoint: `POST /api/v1/shorten`

Use case: Allow a user to create a new short URL.

**Request Body Example (JSON):**

```json
{
  "long_url": "string",
  "expiration_date": "timestamp"
}
```

**Response Examples:**

**201 Created** - Successful Creation:

```json
{
  "short_url": "string",
  "long_url": "string",
  "created_at": "timestamp"
}
```

**400 Bad Request** - Invalid Input:

```json
{
  "error": "string",
  "message": "string"
}
```

**429 Too Many Requests** - Rate Limit Exceeded:

```json
{
  "error": "string",
  "message": "string"
}
```

**B. Link Redirection (Read Operation)**

Method/Endpoint: `GET /{short_key}`

Use case: Resolve the short key to the original long URL. This is the high-volume, performance-critical read path.

**Action:** The server performs a lookup, records the click, and returns an HTTP **301 (Permanent)** or **302 (Temporary)** status code directing the client browser to the `long_url`.

---

## Database Modelling

Here we will mostly focus on modelling the data for the system. Now that we have chosen the type of databases, SQL or NoSQL, we can model the schemas of the data.

**Table `url_mapping`:**

```json
{
  "short_key": "VARCHAR(10)",
  "long_url": "TEXT",
  "user_id": "BIGINT",
  "created_at": "timestamp",
  "expiration_date": "timestamp",
  "is_active": "BOOLEAN"
}
```

---

## High-level Design (Design Diagram)

In high-level design we want to draw and connect the different components of the system. This includes the different services, storage mechanisms, API gateway, caching, message brokers, etc.

![URL Shortener High-level Design](/high-level-design.png)

Unless we are designing a rate limiter or some sort of auth system, we don't need to explicitly include those into every problem.

Don't worry about diving too deep in this section, that can be further explained later.

---

## Detailed Design

Here we dive deeper into any components that need further explaining. For example, in URL shortener we have to actually discuss our hashing algorithm or creating the short URLs.

---

## Bottlenecks, Tradeoffs, and Scaling

This section is less structured and more for you to identify any further scalability issues that need to be addressed. We should discuss multiple tradeoffs to solve problems here.

---
