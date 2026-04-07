<script setup lang="ts">
import { ref } from 'vue'

const name = ref('Your Name')
const email = ref('your.email@example.com')
const phone = ref('123-456-7890')
const location = ref('City, State')

const summary = ref(
  'A brief introduction of yourself highlighting your career objectives, key skills and achievements.',
)

const skills = ref(['Skill 1', 'Skill 2', 'Skill 3'])

const experience = ref([
  {
    position: 'Position 1',
    company: 'Company 1',
    startDate: 'Jan 2018',
    endDate: 'Dec 2020',
    tasks: ['Task 1', 'Task 2', 'Task 3'],
  },
  {
    position: 'Position 2',
    company: 'Company 2',
    startDate: 'Jan 2016',
    endDate: 'Dec 2017',
    tasks: ['Task 1', 'Task 2'],
  },
])

const education = ref([
  {
    school: 'University 1',
    degree: 'Bachelor',
    major: 'Computer Science',
    startDate: 'Sep 2012',
    endDate: 'May 2016',
  },
  {
    school: 'University 2',
    degree: 'Master',
    major: 'Engineering',
    startDate: 'Sep 2016',
    endDate: 'May 2018',
  },
])
</script>

<template>
  <div :class="$style.resume">
    <h1>{{ name }}</h1>
    <div :class="$style.basicInfo">
      <p>Email: {{ email }}</p>
      <p>Phone: {{ phone }}</p>
      <p>Location: {{ location }}</p>
    </div>
    <div :class="$style.summary">
      <h2>Summary</h2>
      <p>{{ summary }}</p>
    </div>
    <div :class="$style.skills">
      <h2>Skills</h2>
      <ul>
        <li v-for="(skill, index) in skills" :key="index">{{ skill }}</li>
      </ul>
    </div>
    <div :class="$style.experience">
      <h2>Experience</h2>
      <div v-for="(exp, index) in experience" :key="index">
        <h3>{{ exp.position }} @ {{ exp.company }}</h3>
        <p>{{ exp.startDate }} - {{ exp.endDate }}</p>
        <ul>
          <li v-for="(task, taskIndex) in exp.tasks" :key="taskIndex">{{ task }}</li>
        </ul>
      </div>
    </div>
    <div :class="$style.education">
      <h2>Education</h2>
      <div v-for="(edu, index) in education" :key="index">
        <h3>{{ edu.school }}</h3>
        <p>{{ edu.degree }} in {{ edu.major }}</p>
        <p>{{ edu.startDate }} - {{ edu.endDate }}</p>
      </div>
    </div>
  </div>
</template>

<style module>
.resume {
  max-width: 800px;
  margin: 20px auto;
}

.basicInfo p {
  margin: 0;
}

.skills li {
  display: inline-block;
  margin-right: 10px;
}

.experience h3,
.education h3 {
  margin-top: 20px;
  margin-bottom: 5px;
}

.experience p,
.education p {
  margin: 0;
}
</style>
