## Introduction

Alright, so picture this: You walk into that interview feeling pretty damn good. You've practiced system design questions until you could solve the URL shortener problem in your sleep. You're ready.

Then you hit the Non-functional Requirements section. The interviewer leans back and casually asks, "So, what kind of storage are we talking about for your database? And what's the throughput looking like?"

And just like that, everything falls apart. Now you're stuck doing mental gymnastics with math you haven't touched since college, trying to multiply huge numbers in your head or scribbling frantically on a whiteboard—when in real life you'd just pull out a calculator like a normal human being.

Good news though: I put together a cheat sheet that'll save your ass in these situations.

---

## The Golden Rule

Here's the thing—in interviews, they only care about **order of magnitude**. Not exact numbers. So we can estimate.

**The one trick you absolutely need to remember:**

```
2^10 ≈ 10^3
```

This is your golden ticket. Memorize it.

---

## Storage Calculation Example: URL Shortener

Let's work through this. Say each URL is 8 characters long, and we're only using lowercase letters. That's 26 letters in the alphabet, so we're looking at **26^8 possible combinations**.

### Step-by-Step Calculation

**Step 1:** Estimate to the nearest power of 2 (2, 4, 8, 16, 32, 64, 128)

```
26^8 ≈ (32)^8
```

**Step 2:** Rewrite as 2^x

```
(32)^8 = (2^5)^8
```

**Step 3:** Multiply the powers

```
(2^5)^8 = 2^40
```

**Step 4:** Break down into a multiple of 10

```
2^40 = (2^10)^4
```

(We can see that 40 = 10 × 4)

**Step 5:** Swap using our cheat code (2^10 ≈ 10^3)

```
(2^10)^4 ≈ (10^3)^4
```

**Step 6:** Simplify

```
(10^3)^4 = 10^12
```

### Converting to Storage Size

Each character in UTF-8 is 1 byte (8 bits, but we never use bits anyways).

**Quick storage reference to memorize:**

- **1 KB** = 10³ bytes (thousand)
- **1 MB** = 10⁶ bytes (million)
- **1 GB** = 10⁹ bytes (billion)
- **1 TB** = 10¹² bytes (trillion)

**Result:** We need about **1 Terabyte of storage**.

### How Many URLs Can We Store?

**Step 1:** Start with our total bytes

```
10^12 bytes total
```

**Step 2:** Divide by bytes per URL (round 8 → 10 for easier math)

```
10^12 ÷ 8 bytes per URL ≈ 10^12 ÷ 10
```

**Step 3:** Simplify

```
10^12 ÷ 10 = 10^11 URLs
```

That's a hell of a lot of URLs.

---

## Throughput Calculation Example

Say we've got **10 million users per day**, and each user makes about **6 requests** on average. That's **60 million requests per day**.

### Converting Days to Seconds

There are:

```
24 hours × 60 min × 60 sec = 86,400 seconds/day
≈ 8.6 × 10^4
≈ 10^5 seconds per day
```

(We're rounding for estimation)

### Calculating Requests Per Second

```
60 × 10^6 requests ÷ 10^5 seconds = 600 requests/second
```

### Breaking Down by Read/Write Ratio

Now if we've got a **5:1 read-to-write ratio**:

- **500 req/sec** for reads
- **100 req/sec** for writes

---

## Quick Reference Cheat Sheet

### The Core Formula

```
2^10 ≈ 10^3
```

### Storage Units

| Unit      | Abbreviation | Bytes | Common Name |
| --------- | ------------ | ----- | ----------- |
| Kilobytes | Kb           | 10³   | Thousand    |
| Megabytes | Mb           | 10⁶   | Million     |
| Gigabytes | Gb           | 10⁹   | Billion     |
| Terabytes | Tb           | 10¹²  | Trillion    |

### Powers of 2 to Memorize

- 2, 4, 8, 16, 32, 64, 128
- Always round to the nearest power of 2

### Time Conversions

- **Seconds per day:** ~10^5 (actually 86,400)
- **Seconds per month:** ~2.6 × 10^6
- **Seconds per year:** ~3.2 × 10^7

---

## Summary

And there you have it. That's the framework. Memorize that **2^10 ≈ 10^3** trick and you'll be able to estimate your way through any storage or throughput question they throw at you.

The key takeaways:

1. Always estimate to the nearest power of 2
2. Break down exponents into multiples of 10
3. Use the 2^10 ≈ 10^3 conversion
4. Round for easier mental math (8 → 10)
5. Focus on order of magnitude, not exact numbers
