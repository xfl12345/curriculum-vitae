<script setup lang="ts">
import { computed, ref } from 'vue'

import type { BasicInformation } from '@/model/business'

import { BasicInfoPair } from '@/components/cv/BasicInfoPair'
import { useI18nStore } from '@/stores/i18n'

import type { KeyValuePair } from '../BasicInfoPair/types'
import type { Emits, Props } from './types'

const { currentI18nBook: currentBook } = useI18nStore()
const translations = currentBook.static.cvBasicInformation

const props = withDefaults(defineProps<Props>(), {
  theFontSizeInPixel: 24,
  basicInformation: () => ({
    jobPrefer: { theCopyValue: '' },
    facePhoto: '',
  }),
})

const emit = defineEmits<Emits>()

function openHiddenEggPanel() {
  emit('openHiddenEggPanel')
}

type BasicInfoKey = Exclude<keyof BasicInformation, 'facePhoto'>

const leftGroup = ref<Array<InstanceType<typeof BasicInfoPair>>>()
const leftGroupKeyBoxWidth = ref(translations.jobPrefer.length * props.theFontSizeInPixel)
const updateLeftGroupKeyBoxWidth = () => {
  let result = 400
  if (leftGroup.value) {
    result = leftGroup.value[0]?.rootBoxOfKey?.offsetWidth ?? 400
  }
  leftGroupKeyBoxWidth.value = result
}

const jobPreferKV = computed<KeyValuePair>(() => {
  const valuePair = props.basicInformation.jobPrefer
  return {
    theKey: translations.jobPrefer,
    theDisplayValue: valuePair.theDisplayValue ?? valuePair.theCopyValue,
    theCopyValue: valuePair.theCopyValue,
  }
})

const group1ItemKeyList: BasicInfoKey[] = [
  'name',
  'phoneNumberSameToWechat',
  'emailAddress',
  'birthdayInYearAndMonth',
  'maritalStatus',
]
const group2ItemKeyList: BasicInfoKey[] = ['nation', 'stature', 'schooling', 'lastInstitute', 'nativePlace']

const myCache = computed(() => {
  const theMap = new Map<BasicInfoKey, KeyValuePair>()
  const getTheCopyValue = (key: BasicInfoKey): string => {
    return props.basicInformation[key]?.theCopyValue ?? ''
  }

  const getTheDisplayValue = (key: BasicInfoKey): string => {
    const pair = props.basicInformation[key]
    if (!pair) return ''
    return pair.theDisplayValue ?? pair.theCopyValue
  }
  const putInCache = (key: BasicInfoKey) => {
    theMap.set(key, {
      theKey: translations[key],
      theDisplayValue: getTheDisplayValue(key),
      theCopyValue: getTheCopyValue(key),
    })
  }
  group1ItemKeyList.forEach(putInCache)
  group2ItemKeyList.forEach(putInCache)
  return theMap
})
</script>

<template>
  <div ref="templateRoot">
    <div :class="$style.layout">
      <div :class="$style.leftArea">
        <div v-resize="updateLeftGroupKeyBoxWidth" :class="$style.leftGroupContainer">
          <div :class="$style.leftGroupRow">
            <div :class="$style.leftGroupCol">
              <BasicInfoPair
                v-for="item in group1ItemKeyList"
                ref="leftGroup"
                :key="item"
                :key-value-pair="myCache.get(item)"
                :the-max-font-count="5"
                :the-font-size-in-pixel="theFontSizeInPixel"
              />
            </div>
            <div :class="$style.leftGroupCol">
              <BasicInfoPair
                v-for="item in group2ItemKeyList"
                :key="item"
                :key-value-pair="myCache.get(item)"
                :the-max-font-count="5"
                :the-font-size-in-pixel="theFontSizeInPixel"
              />
            </div>
          </div>
          <div :class="$style.leftGroupRow">
            <BasicInfoPair
              :class="$style.fullWidth"
              :the-font-size-in-pixel="theFontSizeInPixel"
              :key-value-pair="jobPreferKV"
              :the-max-font-count="5"
              :fixed-key-root-box-width="leftGroupKeyBoxWidth + 'px'"
            />
          </div>
        </div>
      </div>
      <div :class="$style.photoArea">
        <img
          :class="$style.photo"
          :src="basicInformation.facePhoto"
          alt="facePhoto"
          @click="openHiddenEggPanel"
        />
      </div>
    </div>
  </div>
</template>

<style module>
.layout {
  width: 100%;
  display: flex;
}
.leftArea {
  flex: 8;
  display: flex;
}
.leftGroupContainer {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.leftGroupRow {
  flex: 1;
  display: flex;
}
.leftGroupCol {
  flex: 4;
}
.fullWidth {
  width: 100%;
}
.photoArea {
  flex: 1;
}
.photo {
  width: 100%;
}
</style>
