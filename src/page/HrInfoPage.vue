<template>
  <div ref="templateRoot">
    <vxe-grid ref="xGrid" v-bind="gridOptions">
      <template #pager>
        <vxe-pager ref="gridPager" perfect @page-change="handlePageChange">
          <template #left>
            <span class="page-left">
              <span class="select-count">已选中 {{ gridData.selectRecords.length }} 条&nbsp;</span>
              <vxe-button>修改</vxe-button>
              <vxe-button>删除</vxe-button>
            </span>
          </template>
        </vxe-pager>
      </template>
    </vxe-grid>
  </div>
</template>

<script lang="tsx">
import { defineComponent, ref } from "vue";
import "vxe-table/lib/style.css";
import { VxeGrid, VxePager, VxeGridInstance, VxeGridProps } from "vxe-table";

export default defineComponent({
  components: { VxeGrid, VxePager },
  props: {},
  emits: [],
  setup(props, ctx) {
    const templateRoot = ref<HTMLDivElement>();
    const xGrid = ref<VxeGridInstance>();

    return {
      xGrid,
      templateRoot
    };
  },
  data() {
    const myself = this;
    const gridOptions: VxeGridProps = {
      loading: false,
      height: "700px",
      headerAlign: "center",
      keepSource: true,
      autoResize: true,
      stripe: true,
      border: true,
      customConfig: {
        storage: {
          visible: true,
          resizable: true
        }
      },
      editConfig: {
        trigger: "manual",
        mode: "row",
        showStatus: true,
        icon: "fa fa-file-text-o"
      },
      columnConfig: {
        resizable: true,
        isCurrent: true,
        isHover: true,
        useKey: true
      },
      rowConfig: {
        isCurrent: true,
        isHover: true,
        useKey: true
      },
      mouseConfig: {
        selected: true
      },
      toolbarConfig: {
        custom: true,
        refresh: {
          queryMethod: (obj) => {
            console.log("vxeTable触发了 toolbar 刷新事件，page=" + JSON.stringify(obj.page));
            return myself.handleVxeTableAjaxQuery(obj);
          }
        }
      },
      pagerConfig: {
        pageSize: 15
      },
      // proxyConfig: {
      //   ajax: {
      //     query: (obj) => {
      //       console.log("vxeTable触发了数据代理事件，page=" + JSON.stringify(obj.page));
      //       return myself.handleVxeTableAjaxQuery(obj);
      //     }
      //   }
      // },
      columns: [
        { type: "checkbox", width: 60 },
        { field: "name", title: "Name", width: 200, resizable: false, slots: { header: "name_header" } },
        { field: "age", title: "Age", width: 100 },
        {
          field: "num1",
          title: "Num1",
          showHeaderOverflow: true,
          filters: [{ data: "" }],
          editRender: { autofocus: ".my-input" }
        }
      ]
      // data: []
    };
    return {
      gridOptions,
      gridData: {
        selectRecords: [] as any[]
      }
    };
  },
  computed: {},
  watch: {},
  beforeCreate() {},
  created() {},
  beforeMount() {},
  mounted() {},
  beforeUpdate() {},
  updated() {},
  activated() {},
  deactivated() {},
  beforeUnmount() {},
  unmounted() {},
  methods: {
    handleVxeTableAjaxQuery(obj: { [key: string]: any }) {
      return new Promise((resolve, reject) => {
        resolve(666);
      });
    },
    handlePageChange() {}
  }
});
</script>
