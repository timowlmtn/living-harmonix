# Living Harmonix
Living Harmonix is a platform for developing and sharing
agents based on prompts and backend code.

It allows users to create agents with expertise in a subject
that can guide the user in a way that increases the harmony 
in their lives.

The agents/personal illustrates how to create agents.

## Types of Users

We have two types of users: public users and producers.

Public users use the website as their starting point, or 
they may only know of Living Harmonix agent through a protocol 
like Nanda.

Producers will create their own agents.  They will tailor their
agents to do work within the Living Harmonix ecosystem and 
benefit from that integration

* Authentication
* Stripe Payments
* Integrations with other systems (Google, Instragram, Pinterest, ...)

In external integrations, they will be able to link their agent 
to their existing social media accounts and leverage the agent
to enhance their content.

## Types of Agents

### Operational Agents

Operational agents can be hooked to other agents the agent protocol.

They can take on tasks such as adding things to a calendar, sending SMS
messages, sending emails, posting to social media, etc.

The web API can be a default operational agent to get results from your agent.

### Personal Agents
The agent will either be a stand-alone agent that will run as
a prompt, or it will be a pipeline agent that may need to run
through several stages and keep track of the status of each stage.

For example, the "tour-de-france.md" agent is an agent that will
help with shopping and menu planning to make cooking dinner 
and watching the Tour-de-France an enjoyable part of your life.

It is an agent that lives for a while and then when the tour is done,
it is not as relevant.  It may be able to interface with your
google calendar to give you tasks or with your email or SMS to send 
you recipe ideas.

Other agents require the user to take steps to accomplish a goal.
For example, the Feng Shui agent contains a pipeline that will 
trace your Feng Shui transformation.  It will interact with you
and gather your data.  Each pipeline has a separate prompt and as a 
subscriber to this agent, you would complete each stage in your Feng 
Shui project.


## License

MIT © 2025 Living Harmonix Inc.
