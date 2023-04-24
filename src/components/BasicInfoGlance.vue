<template>
  <div ref="templateRoot">
    <div style="width: 100%; display: flex">
      <div style="flex: 8; display: flex">
        <div style="flex: 1; display: flex">
          <div style="flex: 4">
            <basic-info-pair
              v-for="item in group1ItemKeyList"
              :key="item"
              :key-value-pair="myCache.get(item)"
              :the-max-font-count="5"
              :the-font-size-in-pixel="theFontSizeInPixel"
            />
          </div>
          <div style="flex: 4">
            <basic-info-pair
              v-for="item in group2ItemKeyList"
              :key="item"
              :key-value-pair="myCache.get(item)"
              :the-max-font-count="5"
              :the-font-size-in-pixel="theFontSizeInPixel"
            />
          </div>
        </div>
      </div>
      <div style="flex: 1">
        <img style="width: 100%" :src="props.facePhoto" alt="facePhoto" />
      </div>
    </div>
  </div>
</template>

<script setup lang="tsx">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { KeyValuePair } from "../tsmod/KeyValuePair";
import BasicInfoPair from "./BasicInfoPair.vue";

const templateRoot = ref<HTMLDivElement>();

const { t } = useI18n();
const props = defineProps({
  theFontSizeInPixel: {
    type: Number,
    default: 24
  },
  basicInformation: {
    type: Object,
    default: () => {}
  },
  facePhoto: {
    type: String,
    default: ""
  }
});

const getTranslatedString = (key: string) => {
  return t("word." + key);
};

const getTheCopyValue = (key: string) => {
  return props.basicInformation[key].theCopyValue;
};

const getTheDisplayValue = (key: string) => {
  return "theDisplayValue" in props.basicInformation[key]
    ? props.basicInformation[key].theDisplayValue
    : props.basicInformation[key].theCopyValue;
};

const group1ItemKeyList = [
  "name",
  "phoneNumberSameToWechat",
  "emailAddress",
  "birthdayInYearAndMonth",
  "maritalStatus",
  "jobPrefer"
];

const group2ItemKeyList = ["nation", "stature", "schooling", "lastInstitute", "nativePlace"];

const myCache = computed(() => {
  const theMap = new Map() as Map<String, any>;
  const putInCache = (value: string, index: number, array: any) => {
    theMap.set(
      value,
      new KeyValuePair(getTranslatedString(value), getTheDisplayValue(value), getTheCopyValue(value))
    );
  };
  group1ItemKeyList.forEach(putInCache);
  group2ItemKeyList.forEach(putInCache);

  return theMap;
});
</script>
