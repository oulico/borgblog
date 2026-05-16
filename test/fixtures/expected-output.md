---
layout: post
title: "AI Failure Retrospective: deploy-bot — Permission Denied"
date: 2026-05-11 09:46:00 +0900
categories: [ai-agents, failures]
tags: [ai, retrospective, permission_denied]
---

## 🚨 CRITICAL — Permission Denied

**Agent:** deploy-bot  
**Session:** ses_d92b3c11  
**Date:** 2026-05-11 09:46:00  

## TL;DR

403 Forbidden — insufficient permissions

## Lessons Learned

1. gh pr merge --auto was denied due to insufficient repository permissions.
2. Verify token scopes before automated deployment attempts.

## Skills Acquired

`failure-analysis` `permission_denied`
