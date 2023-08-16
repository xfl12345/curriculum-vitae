<template>
  <div ref="templateRoot">
    <div style="width: 100%; display: flex">
      <div style="flex: 8; display: flex">
        <div v-resize="updateLeftGroupKeyBoxWidth" style="flex: 1; display: flex; flex-direction: column">
          <div style="flex: 1; display: flex">
            <div style="flex: 4">
              <basic-info-pair
                v-for="item in group1ItemKeyList"
                ref="leftGroup"
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
          <div style="flex: 1; display: flex">
            <basic-info-pair
              style="width: 100%"
              :the-font-size-in-pixel="theFontSizeInPixel"
              :key-value-pair="jobPreferKV"
              :the-max-font-count="5"
              :fixed-key-root-box-width="leftGroupKeyBoxWidth + 'px'"
            />
          </div>
        </div>
      </div>
      <div style="flex: 1">
        <img style="width: 100%" :src="basicInformation.facePhoto" alt="facePhoto" />
      </div>
    </div>
  </div>
</template>

<script setup lang="tsx">
import { computed, PropType, ref } from "vue";
import { useI18n } from "vue-i18n";
import { KeyValuePair } from "@/tsmod/KeyValuePair";
import { BasicInformation, EmptyBasicInformation } from "@/tsmod/CurriculumVitaeData";
import BasicInfoPair from "@/components/BasicInfoPair.vue";

const templateRoot = ref<HTMLDivElement>();
const leftGroup = ref<Array<InstanceType<typeof BasicInfoPair>>>();

const { t } = useI18n();
const props = defineProps({
  theFontSizeInPixel: {
    type: Number,
    default: 24
  },
  basicInformation: {
    type: Object as PropType<BasicInformation>,
    default: (): BasicInformation => new EmptyBasicInformation()
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

const leftGroupKeyBoxWidth = ref(400);
leftGroupKeyBoxWidth.value = getTranslatedString("jobPrefer").length * props.theFontSizeInPixel;
const updateLeftGroupKeyBoxWidth = () => {
  let result = 400;
  if (typeof leftGroup.value !== "undefined") {
    result = leftGroup.value[0].rootBoxOfKey.offsetWidth ?? 400;
  }
  // console.log("updateLeftGroupKeyBoxWidth", result);
  leftGroupKeyBoxWidth.value = result;
};

const jobPreferKV = computed(() => {
  const valuePair = props.basicInformation.jobPrefer;
  return new KeyValuePair(
    getTranslatedString("jobPrefer"),
    typeof valuePair.theDisplayValue === "undefined" ? valuePair.theCopyValue : valuePair.theDisplayValue,
    valuePair.theCopyValue
  );
});

const group1ItemKeyList = [
  "name",
  "phoneNumberSameToWechat",
  "emailAddress",
  "birthdayInYearAndMonth",
  "maritalStatus"
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
